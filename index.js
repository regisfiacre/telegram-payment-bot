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

      try {
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

🎉 Offre spéciale : 30 USDT  
(Prix normal : 45 USDT)

━━━━━━━━━━━━━━━━━━
📈 Contenu exclusif  
🔒 Accès privé 12 mois  
━━━━━━━━━━━━━━━━━━

Paye ici :

${invoiceUrl}

⚠️ Après paiement, l'accès est automatique.`,
        });

      } catch (error) {
        console.error("Erreur création invoice:", error.response?.data || error.message);
      }
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

      // Expiration 1 an
      const oneYear = 365 * 24 * 60 * 60;
      const expireDate = Math.floor(Date.now() / 1000) + oneYear;

      // Lien unique valable 1 an
      const invite = await axios.post(
        `${TELEGRAM_API}/createChatInviteLink`,
        {
          chat_id: CHANNEL_ID,
          member_limit: 1,
          expire_date: expireDate
        }
      );

      const inviteLink = invite.data.result.invite_link;

      // Message confirmation
      await axios.post(
        `${TELEGRAM_API}/sendMessage`,
        {
          chat_id: userId,
          text: `✅ PAIEMENT CONFIRMÉ

Bienvenue dans le VIP 👑

━━━━━━━━━━━━━━━━━━
🔒 Accès valable 12 mois
━━━━━━━━━━━━━━━━━━

Voici ton lien privé :

${inviteLink}

⚠️ Lien personnel, utilisable une seule fois.`,
        }
      );

      console.log("Accès VIP envoyé à", userId);

    } catch (error) {
      console.error("Erreur paiement:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});


app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running...");
});
