const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// =============================
// TELEGRAM WEBHOOK
// =============================
app.post("/telegram", async (req, res) => {
  const message = req.body.message;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (text && text.startsWith("/start")) {

      const payment = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        {
          price_amount: 30,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id: String(chatId),
          order_description: "annual_vip"
        },
        {
          headers: {
            "x-api-key": NOWPAYMENTS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      const invoiceUrl = payment.data.invoice_url;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `💎 ACCÈS VIP 💎

🎉 Offre spéciale de lancement : 30 USDT  
(Prix normal : 45 USDT)

━━━━━━━━━━━━━━━━━━
📈 Contenu exclusif réservé aux membres  
🔒 Accès privé pendant 12 mois  
⏳ La promotion expire bientôt  
━━━━━━━━━━━━━━━━━━

Sécurise ta place dès maintenant :

${invoiceUrl}

━━━━━━━━━━━━━━━━━━

⚠️ Une fois la promotion terminée, le prix repassera définitivement à 45 USDT.`,
      });
    }
  }

  res.sendStatus(200);
});

// =============================
// NOWPAYMENTS WEBHOOK
// =============================
app.post("/payment", async (req, res) => {
  const payment = req.body;

  if (payment.payment_status === "finished") {

    const userId = payment.order_id;

    try {
      // 🔹 1. Créer lien invitation unique
      const invite = await axios.post(
        `${TELEGRAM_API}/createChatInviteLink`,
        {
          chat_id: CHANNEL_ID,
          member_limit: 1
        }
      );

      const inviteLink = invite.data.result.invite_link;

      // 🔹 2. Envoyer message premium confirmation
      await axios.post(
        `${TELEGRAM_API}/sendMessage`,
        {
          chat_id: userId,
          text: `✅ PAIEMENT CONFIRMÉ

Bienvenue dans le VIP 👑

━━━━━━━━━━━━━━━━━━
🔒 Ton accès est valable pendant 12 mois.
📅 Expiration automatique dans 1 an.
━━━━━━━━━━━━━━━━━━

Voici ton lien privé d’accès :

${inviteLink}

⚠️ Ce lien est personnel et valable pour une seule utilisation.`,
        }
      );

      console.log("Accès VIP envoyé à", userId);

      // 🔹 3. Programmer bannissement automatique après 365 jours
      const oneYear = 365 * 24 * 60 * 60;
      const expireDate = Math.floor(Date.now() / 1000) + oneYear;

      await axios.post(
        `${TELEGRAM_API}/banChatMember`,
        {
          chat_id: CHANNEL_ID,
          user_id: userId,
          until_date: expireDate
        }
      );

    } catch (error) {
      console.error("Erreur paiement :", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running...");
});
