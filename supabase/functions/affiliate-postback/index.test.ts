import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateRefundClawback, handleAffiliatePostback } from "./index.ts";

const purchasePayload = {
  click_id: "fdf46c3d-77e7-4a58-8b31-aef8c52b0f65",
  order_id: "6591758401601",
  order_total: 629.95,
  currency: "USD",
  test: false,
  metadata: {
    event: "purchase",
    event_time: "2026-04-28T08:24:16.050Z",
    order_number: "#1008",
    order_status: "paid",
    shipping_total: 0,
    tax_total: 0,
    discount_total: 0,
    items_count: 1,
    line_items: [
      {
        product_id: "8901234567890",
        variant_id: "4567890123456",
        sku: "sku-managed-1",
        title: "The Multi-managed Snowboard",
        quantity: 1,
        price: 629.95,
        total_discount: 0,
      },
    ],
    customer: { email: "buyer@example.com", phone: null },
    store: { platform: "shopify", site_url: "https://mystorefront-test.myshopify.com" },
  },
};

const refundPayload = {
  click_id: "fdf46c3d-77e7-4a58-8b31-aef8c52b0f65",
  order_id: "6591758401601",
  refund_id: "933738938433",
  order_total: -629.95,
  currency: "USD",
  test: false,
  metadata: {
    event: "refund",
    event_time: "2026-04-28T08:24:16.173Z",
    order_number: "#1008",
    refund_reference: "933738938433",
    refund_note: "test refund — postback verification",
    items_count: 1,
    line_items: [
      {
        product_id: "8901234567890",
        variant_id: "4567890123456",
        sku: "sku-managed-1",
        title: "The Multi-managed Snowboard",
        quantity: 1,
        price: 629.95,
        subtotal: 629.95,
        total_tax: 0,
      },
    ],
    customer: { email: "buyer@example.com", phone: null },
    store: { platform: "shopify", site_url: "https://mystorefront-test.myshopify.com" },
  },
};

type State = {
  click: any;
  brand: any;
  link: any;
  orders: any[];
  refunds: any[];
  brandUpdates: any[];
};

class FakeQuery {
  filters: Record<string, unknown> = {};
  selected = "";

  constructor(private state: State, private table: string, private operation?: string, private payload?: any) {}

  select(columns?: string) {
    this.selected = columns || "";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  update(payload: any) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  insert(payload: any) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  maybeSingle() {
    if (this.table === "affiliate_clicks") return Promise.resolve({ data: this.state.click, error: null });
    if (this.table === "brand_accounts") return Promise.resolve({ data: this.state.brand, error: null });
    if (this.table === "affiliate_refunds") {
      return Promise.resolve({
        data: this.state.refunds.find((refund) => refund.refund_id === this.filters.refund_id) || null,
        error: null,
      });
    }
    if (this.table === "affiliate_orders") {
      return Promise.resolve({
        data:
          this.state.orders.find(
            (order) => order.click_id === this.filters.click_id && order.order_id === this.filters.order_id,
          ) || null,
        error: null,
      });
    }
    if (this.table === "links") return Promise.resolve({ data: this.state.link, error: null });
    return Promise.resolve({ data: null, error: null });
  }

  single() {
    if (this.operation === "insert" && this.table === "affiliate_orders") {
      const duplicate = this.state.orders.find(
        (order) => order.brand_id === this.payload.brand_id && order.order_id === this.payload.order_id,
      );
      if (duplicate) return Promise.resolve({ data: null, error: { code: "23505" } });
      const order = { id: `order-${this.state.orders.length + 1}`, ...this.payload };
      this.state.orders.push(order);
      return Promise.resolve({ data: order, error: null });
    }

    if (this.table === "links") return Promise.resolve({ data: this.state.link, error: null });
    return Promise.resolve({ data: null, error: null });
  }

  then(resolve: (value: any) => void) {
    if (this.operation === "insert" && this.table === "affiliate_refunds") {
      const duplicate = this.state.refunds.find((refund) => refund.refund_id === this.payload.refund_id);
      if (duplicate) return Promise.resolve({ error: { code: "23505" } }).then(resolve);
      this.state.refunds.push({ id: `refund-${this.state.refunds.length + 1}`, ...this.payload });
      return Promise.resolve({ error: null }).then(resolve);
    }

    if (this.operation === "update" && this.table === "affiliate_orders") {
      const order = this.state.orders.find((item) => item.id === this.filters.id);
      if (order) Object.assign(order, this.payload);
      return Promise.resolve({ error: null }).then(resolve);
    }

    if (this.operation === "update" && this.table === "links") {
      Object.assign(this.state.link, this.payload);
      return Promise.resolve({ error: null }).then(resolve);
    }

    if (this.operation === "update" && this.table === "brand_accounts") {
      this.state.brandUpdates.push({ ...this.payload, id: this.filters.id });
      return Promise.resolve({ error: null }).then(resolve);
    }

    return Promise.resolve({ error: null }).then(resolve);
  }
}

const createFakeClient = (state: State) => () => ({
  from: (table: string) => new FakeQuery(state, table),
});

const post = (payload: any) =>
  new Request("https://example.test/affiliate-postback", {
    method: "POST",
    headers: { Authorization: "Bearer secret", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

const baseState = (): State => ({
  click: {
    click_id: purchasePayload.click_id,
    creator_id: "creator-1",
    brand_id: "brand-1",
    link_id: "link-1",
  },
  brand: { webhook_secret: "secret", commission_percent: 10 },
  link: { id: "link-1", platform: "shopify", orders: 0, earned: 0 },
  orders: [],
  refunds: [],
  brandUpdates: [],
});

Deno.test("purchase payload succeeds and stores immutable order values", async () => {
  const state = baseState();
  const response = await handleAffiliatePostback(post(purchasePayload), createFakeClient(state) as any);
  const body = await response.json();

  assertEquals(response.status, 201);
  assertEquals(body.success, true);
  assertEquals(state.orders.length, 1);
  assertEquals(state.orders[0].original_order_total, purchasePayload.order_total);
  assertEquals(state.orders[0].original_commission_amount, 62.995);
  assertEquals(state.link.orders, 1);
  assertEquals(state.link.earned, 62.995);
});

Deno.test("refund payload succeeds and duplicate refund returns 200 without reprocessing", async () => {
  const state = baseState();
  state.orders.push({
    id: "order-1",
    click_id: purchasePayload.click_id,
    order_id: purchasePayload.order_id,
    brand_id: "brand-1",
    creator_id: "creator-1",
    order_total: 629.95,
    original_order_total: 629.95,
    commission_amount: 62.995,
    original_commission_amount: 62.995,
  });
  state.link.earned = 62.995;

  const first = await handleAffiliatePostback(post(refundPayload), createFakeClient(state) as any);
  const firstBody = await first.json();
  const second = await handleAffiliatePostback(post(refundPayload), createFakeClient(state) as any);
  const secondBody = await second.json();

  assertEquals(first.status, 200);
  assertEquals(firstBody.success, true);
  assertEquals(state.orders[0].commission_amount, 0);
  assertEquals(state.link.earned, 0);
  assertEquals(state.refunds.length, 1);
  assertEquals(state.refunds[0].commission_clawback_amount, 62.995);
  assertEquals(second.status, 200);
  assertEquals(secondBody.duplicate, true);
  assertEquals(state.refunds.length, 1);
});

Deno.test("partial refunds calculate clawback from original commission and store actual applied clawback", () => {
  const result = calculateRefundClawback({
    refundOrderTotal: -250,
    originalOrderTotal: 1000,
    originalCommissionAmount: 100,
    currentCommissionAmount: 20,
  });

  assertEquals(result.refundRatio, 0.25);
  assertEquals(result.calculatedClawback, 25);
  assertEquals(result.actualAppliedClawback, 20);
  assertEquals(result.newCommission, 0);
});

Deno.test("multiple partial refunds keep total clawback accurate from original commission", async () => {
  const state = baseState();
  state.orders.push({
    id: "order-1",
    click_id: purchasePayload.click_id,
    order_id: purchasePayload.order_id,
    brand_id: "brand-1",
    creator_id: "creator-1",
    order_total: 1000,
    original_order_total: 1000,
    commission_amount: 100,
    original_commission_amount: 100,
  });
  state.link.earned = 100;

  const refundOne = { ...refundPayload, refund_id: "refund-1", order_total: -250, metadata: { ...refundPayload.metadata, refund_reference: "refund-1" } };
  const refundTwo = { ...refundPayload, refund_id: "refund-2", order_total: -250, metadata: { ...refundPayload.metadata, refund_reference: "refund-2" } };

  await (await handleAffiliatePostback(post(refundOne), createFakeClient(state) as any)).text();
  await (await handleAffiliatePostback(post(refundTwo), createFakeClient(state) as any)).text();

  assertEquals(state.orders[0].commission_amount, 50);
  assertEquals(state.link.earned, 50);
  assertEquals(state.refunds.map((refund) => refund.commission_clawback_amount), [25, 25]);
});

Deno.test("refund with no matching commission logs no-op and persists only with required identifiers", async () => {
  const state = baseState();
  const response = await handleAffiliatePostback(post(refundPayload), createFakeClient(state) as any);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.no_matching_commission, true);
  assertEquals(state.refunds.length, 1);
  assertEquals(state.refunds[0].click_id, refundPayload.click_id);
  assertEquals(state.refunds[0].order_id, refundPayload.order_id);
  assertEquals(state.refunds[0].refund_id, refundPayload.refund_id);
});

Deno.test("malformed refund payload returns 400", async () => {
  const state = baseState();
  const response = await handleAffiliatePostback(post({ ...refundPayload, refund_id: undefined }), createFakeClient(state) as any);
  const body = await response.json();

  assertEquals(response.status, 400);
  assert(body.error.includes("Missing required refund fields"));
});
