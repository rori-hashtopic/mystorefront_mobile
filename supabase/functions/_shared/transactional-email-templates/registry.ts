/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";

export interface TemplateEntry {
  component: React.ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  to?: string;
  displayName?: string;
  previewData?: Record<string, any>;
}

import { template as giftRequestCreator } from "./gift-request-creator.tsx";
import { template as giftResponseBrand } from "./gift-response-brand.tsx";
import { template as giftStatusCreator } from "./gift-status-creator.tsx";
import { template as giftPostedBrand } from "./gift-posted-brand.tsx";
import { template as mentionStatus } from "./mention-status.tsx";
import { template as discountStatus } from "./discount-status.tsx";
import { template as creatorWaitlistRegret } from "./creator-waitlist-regret.tsx";
import { template as creatorApplicationReceived } from "./creator-application-received.tsx";
import { template as creatorApplicationAdminNotification } from "./creator-application-admin-notification.tsx";
import { template as creatorNudgeMagicLink } from "./creator-nudge-magic-link.tsx";
import { template as creatorInvite } from "./creator-invite.tsx";
import { template as brandCreatorInvite } from "./brand-creator-invite.tsx";
import { template as creatorMagicLink } from "./creator-magic-link.tsx";
import { template as collabInviteCreator } from "./collab-invite-creator.tsx";
import { template as collabStatus } from "./collab-status.tsx";
import { template as briefStatus } from "./brief-status.tsx";
import { template as newMessage } from "./new-message.tsx";
import { template as unreadMessages } from "./unread-messages.tsx";

export const TEMPLATES: Record<string, TemplateEntry> = {
  "collab-invite-creator": collabInviteCreator,
  "collab-status": collabStatus,
  "brief-status": briefStatus,
  "gift-request-creator": giftRequestCreator,
  "gift-response-brand": giftResponseBrand,
  "gift-status-creator": giftStatusCreator,
  "gift-posted-brand": giftPostedBrand,
  "mention-status": mentionStatus,
  "discount-status": discountStatus,
  "creator-waitlist-regret": creatorWaitlistRegret,
  "creator-application-received": creatorApplicationReceived,
  "creator-application-admin-notification": creatorApplicationAdminNotification,
  "creator-nudge-magic-link": creatorNudgeMagicLink,
  "creator-invite": creatorInvite,
  "brand-creator-invite": brandCreatorInvite,
  "creator-magic-link": creatorMagicLink,
  "new-message": newMessage,
  "unread-messages": unreadMessages,
};
