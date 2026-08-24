CREATE OR REPLACE FUNCTION public.notify_brand_on_paid_collab_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
  v_brand_id uuid;
  v_creator_id uuid;
  v_brand_owner_id uuid;
  v_creator_name text;
  v_service_key text;
  v_idempotency_key text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.message_type <> 'paid_collab' THEN
    RETURN NEW;
  END IF;

  v_old_status := OLD.brief_data ->> 'status';
  v_new_status := NEW.brief_data ->> 'status';

  IF v_new_status IS NULL
     OR v_old_status IS NULL
     OR v_old_status = v_new_status
     OR v_new_status NOT IN ('accepted', 'declined', 'negotiating') THEN
    RETURN NEW;
  END IF;

  SELECT c.brand_id, c.creator_id
    INTO v_brand_id, v_creator_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id
  LIMIT 1;

  IF v_brand_id IS NULL OR v_creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify brands when the creator is the actor changing the status.
  IF auth.uid() IS DISTINCT FROM v_creator_id THEN
    RETURN NEW;
  END IF;

  SELECT ba.owner_user_id
    INTO v_brand_owner_id
  FROM public.brand_accounts ba
  WHERE ba.id = v_brand_id
  LIMIT 1;

  IF v_brand_owner_id IS NULL THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message, metadata)
    VALUES (
      NEW.id::text || '-collab-status-' || v_new_status || '-brand-missing-owner',
      'collab-status',
      NULL,
      'failed',
      'No brand owner found for paid collab status notification',
      jsonb_build_object('message_id', NEW.id, 'brand_id', v_brand_id, 'status', v_new_status)
    );
    RETURN NEW;
  END IF;

  v_idempotency_key := 'collab-status-' || NEW.id::text || '-' || v_new_status || '-brand';

  -- Do not queue a second brand notification for the same message/status once it has actually queued or sent.
  IF EXISTS (
    SELECT 1
    FROM public.email_send_log
    WHERE template_name = 'collab-status'
      AND message_id = v_idempotency_key
      AND status IN ('pending', 'sent')
      AND recipient_email IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(p.display_name), ''), 'The creator')
    INTO v_creator_name
  FROM public.profiles p
  WHERE p.id = v_creator_id
  LIMIT 1;

  SELECT decrypted_secret
    INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message, metadata)
    VALUES (
      v_idempotency_key,
      'collab-status',
      NULL,
      'failed',
      'Missing backend service token for paid collab status notification',
      jsonb_build_object('message_id', NEW.id, 'brand_id', v_brand_id, 'status', v_new_status)
    );
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'templateName', 'collab-status',
      'recipientUserId', v_brand_owner_id,
      'idempotencyKey', v_idempotency_key,
      'messageId', v_idempotency_key,
      'templateData', jsonb_build_object(
        'recipientRole', 'brand',
        'creatorName', COALESCE(v_creator_name, 'The creator'),
        'collabTitle', COALESCE(NEW.brief_data ->> 'title', 'your collab'),
        'compensationType', NEW.brief_data ->> 'compensation_type',
        'status', v_new_status,
        'feeAmount', CASE
          WHEN NEW.brief_data ? 'fee_amount' AND jsonb_typeof(NEW.brief_data -> 'fee_amount') = 'number'
            THEN NEW.brief_data -> 'fee_amount'
          ELSE NULL
        END,
        'productName', NEW.brief_data ->> 'product_name',
        'counterNote', CASE WHEN v_new_status = 'negotiating' THEN NEW.brief_data ->> 'creator_counter_note' ELSE NULL END
      )
    )
  );

  RETURN NEW;
END;
$$;