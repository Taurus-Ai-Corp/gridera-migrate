     1|/**
     2| * Stripe Billing Server for GRIDERA Migrate Pro Tier
     3| *
     4| * This is a reference implementation — deploy as a standalone service.
     5| * NOT part of the npm package. Runs on YOUR infrastructure.
     6| *
     7| * Flow:
     8| *   1. Customer visits /checkout → redirected to Stripe Checkout
     9| *   2. Stripe charges $49/mo → webhook fires
    10| *   3. Webhook handler generates HMAC-signed license key
    11| *   4. Customer receives key via email or dashboard
    12| *   5. Customer passes key to SwarmSpawner({ licenseKey }) → Pro unlocked
    13| *
    14| * Setup:
    15| *   1. npm install stripe express
    16| *   2. Create a Stripe product + $49/mo price in Dashboard
    17| *   3. Generate PQC key pair: npx tsx -e "import{LicenseManager}from'@gridera/migrate';const kp=LicenseManager.generateKeyPair();console.log('PUBLIC='+Buffer.from(kp.publicKey).toString('hex'));console.log('SECRET='+Buffe...'hex'))"
    18| *   4. Set env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PQC_LICENSE_PUBLIC_KEY, PQC_LICENSE_SECRET_KEY
    19| *   5. Run: npx tsx examples/stripe-billing/server.ts
    20| *   5. Expose webhook endpoint via ngrok or deploy
    21| *
    22| * Env vars:
    23| *   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
    24| *   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe Dashboard → Webhooks)
    25| *   STRIPE_PRICE_ID         — price_... (your $49/mo price)
    26| *   PQC_LICENSE_SECRET_KEY  — ML-DSA-65 secret key (hex, 8064 chars)
    27| *   PQC_LICENSE_PUBLIC_KEY  — ML-DSA-65 public key (hex, 3904 chars)
    28| *   PORT                    — Server port (default 3456)
    29| */
    30|
    31|// NOTE: This file is a reference example, not compiled with the package.
    32|// To run it, install: npm install stripe express @types/express
    33|
    34|import Stripe from "stripe";
    35|import express from "express";
    36|import { LicenseManager } from "@gridera/migrate";
    37|
    38|// --- Config ---
    39|
    40|const STRIPE_SECRET_KEY=proces..."]!;
    41|const STRIPE_WEBHOOK_SECRET=proces..."]!;
    42|const STRIPE_PRICE_ID = process.env["STRIPE_PRICE_ID"]!;
    43|const PQC_SECRET_KEY=proces..."]!;
    44|const PQC_PUBLIC_KEY = process.env["PQC_LICENSE_PUBLIC_KEY"]!;
    45|const PORT = parseInt(process.env["PORT"] ?? "3456", 10);
    46|
    47|if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !PQC_SECRET_KEY || !PQC_PUBLIC_KEY) {
    48|  console.error("Missing required env vars. See file header for setup.");
    49|  process.exit(1);
    50|}
    51|
    52|const stripe = new Stripe(STRIPE_SECRET_KEY);
    53|// ML-DSA-65 signed license keys — quantum-safe, asymmetric
    54|const licenseManager = LicenseManager.fromHex(PQC_PUBLIC_KEY, PQC_SECRET_KEY);
    55|const app = express();
    56|
    57|// --- In-memory license store (replace with DB in production) ---
    58|
    59|const licenses = new Map<string, { key: string; tier: string; org: string }>();
    60|
    61|// --- Routes ---
    62|
    63|/**
    64| * POST /checkout — Create a Stripe Checkout Session for Pro tier.
    65| * Body: { email: string, org: string }
    66| */
    67|app.post("/checkout", express.json(), async (req, res) => {
    68|  const { email, org } = req.body as { email?: string; org?: string };
    69|
    70|  if (!email || !org) {
    71|    res.status(400).json({ error: "email and org are required" });
    72|    return;
    73|  }
    74|
    75|  const session = await stripe.checkout.sessions.create({
    76|    mode: "subscription",
    77|    customer_email: email,
    78|    metadata: { org },
    79|    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    80|    success_url: `http://localhost:${PORT}/success?session_id={CHECKOUT_SESSION_ID}`,
    81|    cancel_url: `http://localhost:${PORT}/pricing`,
    82|  });
    83|
    84|  res.json({ url: session.url });
    85|});
    86|
    87|/**
    88| * POST /webhook — Stripe webhook handler.
    89| * Must use raw body for signature verification.
    90| */
    91|app.post(
    92|  "/webhook",
    93|  express.raw({ type: "application/json" }),
    94|  async (req, res) => {
    95|    let event: Stripe.Event;
    96|
    97|    try {
    98|      event = stripe.webhooks.constructEvent(
    99|        req.body,
   100|        req.headers["stripe-signature"] as string,
   101|        STRIPE_WEBHOOK_SECRET,
   102|      );
   103|    } catch (err) {
   104|      console.error("Webhook signature verification failed:", err);
   105|      res.status(400).send("Webhook signature verification failed");
   106|      return;
   107|    }
   108|
   109|    switch (event.type) {
   110|      case "checkout.session.completed": {
   111|        const session = event.data.object as Stripe.Checkout.Session;
   112|        const org = session.metadata?.["org"] ?? "unknown";
   113|        const subscriptionId =
   114|          typeof session.subscription === "string"
   115|            ? session.subscription
   116|            : session.subscription?.id;
   117|
   118|        // Generate license key
   119|        const licenseKey = licenseManager.generate({
   120|          tier: "pro",
   121|          org,
   122|          durationDays: 35, // 30 days + 5 day grace period
   123|          features: ["pqc-signing", "mainnet", "all-model-tiers"],
   124|          stripeSubscriptionId: subscriptionId,
   125|        });
   126|
   127|        // Store (replace with DB in production)
   128|        licenses.set(session.customer_email ?? org, {
   129|          key: licenseKey,
   130|          tier: "pro",
   131|          org,
   132|        });
   133|
   134|        console.log(`Pro license generated for ${org}: ${licenseKey.slice(0, 20)}...`);
   135|
   136|        // TODO: Send license key to customer via email (SendGrid, Resend, etc.)
   137|        break;
   138|      }
   139|
   140|      case "invoice.payment_succeeded": {
   141|        const invoice = event.data.object as Stripe.Invoice;
   142|        const subscriptionId =
   143|          typeof invoice.subscription === "string"
   144|            ? invoice.subscription
   145|            : invoice.subscription?.id;
   146|
   147|        if (subscriptionId) {
   148|          // Renewal — generate fresh license key
   149|          const sub = await stripe.subscriptions.retrieve(subscriptionId);
   150|          const org = sub.metadata?.["org"] ?? "unknown";
   151|
   152|          const licenseKey = licenseManager.generate({
   153|            tier: "pro",
   154|            org,
   155|            durationDays: 35,
   156|            features: ["pqc-signing", "mainnet", "all-model-tiers"],
   157|            stripeSubscriptionId: subscriptionId,
   158|          });
   159|
   160|          licenses.set(org, { key: licenseKey, tier: "pro", org });
   161|          console.log(`Pro license renewed for ${org}`);
   162|        }
   163|        break;
   164|      }
   165|
   166|      case "customer.subscription.deleted": {
   167|        const sub = event.data.object as Stripe.Subscription;
   168|        const org = sub.metadata?.["org"] ?? "unknown";
   169|        licenses.delete(org);
   170|        console.log(`Subscription cancelled for ${org} — license revoked`);
   171|        break;
   172|      }
   173|
   174|      case "invoice.payment_failed": {
   175|        const invoice = event.data.object as Stripe.Invoice;
   176|        console.warn(
   177|          `Payment failed for ${invoice.customer_email ?? "unknown"}. ` +
   178|            "Stripe will retry automatically (dunning).",
   179|        );
   180|        break;
   181|      }
   182|
   183|      default:
   184|        // Unhandled event type — log and move on
   185|        break;
   186|    }
   187|
   188|    res.json({ received: true });
   189|  },
   190|);
   191|
   192|/**
   193| * GET /license/:org — Retrieve license key for an org.
   194| * In production, this would be behind authentication.
   195| */
   196|app.get("/license/:org", (req, res) => {
   197|  const entry = licenses.get(req.params["org"]!);
   198|  if (!entry) {
   199|    res.status(404).json({ error: "No active license for this org" });
   200|    return;
   201|  }
   202|  res.json({ licenseKey: entry.key, tier: entry.tier });
   203|});
   204|
   205|/**
   206| * GET /success — Post-checkout success page.
   207| */
   208|app.get("/success", async (req, res) => {
   209|  const sessionId = req.query["session_id"] as string;
   210|  if (!sessionId) {
   211|    res.send("Missing session_id");
   212|    return;
   213|  }
   214|
   215|  const session = await stripe.checkout.sessions.retrieve(sessionId);
   216|  const org = session.metadata?.["org"] ?? "unknown";
   217|  const entry = licenses.get(session.customer_email ?? org);
   218|
   219|  res.send(`
   220|    <h1>Welcome to GRIDERA Migrate Pro!</h1>
   221|    <p>Your license key:</p>
   222|    <pre style="background:#1a1a2e;color:#0ff;padding:16px;border-radius:8px;overflow-x:auto">${entry?.key ?? "(processing — check back in a moment)"}</pre>
   223|    <p>Add it to your config:</p>
   224|    <pre style="background:#1a1a2e;color:#0f0;padding:16px;border-radius:8px">
   225|const spawner = new SwarmSpawner({
   226|  licenseKey: "${entry?.key?.slice(0, 30) ?? "..."}...",
   227|  executor: yourExecutor,
   228|});</pre>
   229|  `);
   230|});
   231|
   232|// --- Start ---
   233|
   234|app.listen(PORT, () => {
   235|  console.log(`GRIDERA Migrate Billing Server running on http://localhost:${PORT}`);
   236|  console.log(`  POST /checkout     — Create checkout session`);
   237|  console.log(`  POST /webhook      — Stripe webhook handler`);
   238|  console.log(`  GET  /license/:org — Retrieve license key`);
   239|});
   240|