const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Endpoint Telegram webhook
app.post("/telegram", async (req, res) => {
  const message = req.body.message;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    // 🔹 COMMANDE /start
    if (text === "/start") {

      const payment = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        {
          price_amount: 10,
          price_currency: "usd",
          pay_currency: "usdttrc20",
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
        text: `Paye ici pour accéder au canal VIP:\n${invoiceUrl}`,
      });
    }

    // 🔥 NOUVELLE COMMANDE /testvip
    if (text === "/testvip") {
      try {
        const invite = await axios.post(
          `${TELEGRAM_API}/createChatInviteLink`,
          {
            chat_id: CHANNEL_ID,
            member_limit: 1
          }
        );

        const inviteLink = invite.data.result.invite_link;

        await axios.post(
          `${TELEGRAM_API}/sendMessage`,
          {
            chat_id: chatId,
            text: `🧪 TEST VIP :

${inviteLink}`
          }
        );

      } catch (error) {
        console.error("Erreur test VIP :", error.response?.data || error.message);
      }
    }
  }

  res.sendStatus(200);
});
// Endpoint NowPayments webhook
app.post("/payment", async (req, res) => {
  const payment = req.body;

  if (payment.payment_status === "finished") {
  const userId = payment.order_id;

  try {
    // 1️⃣ Créer un lien d'invitation unique (1 seule utilisation)
    const invite = await axios.post(
      `${TELEGRAM_API}/createChatInviteLink`,
      {
        chat_id: CHANNEL_ID,
        member_limit: 1
      }
    );

    const inviteLink = invite.data.result.invite_link;

    // 2️⃣ Envoyer le lien VIP à l'utilisateur
    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      {
        chat_id: userId,
        text: `✅ Paiement confirmé !

Voici ton accès VIP :
${inviteLink}`
      }
    );

    console.log("Lien VIP envoyé à", userId);

  } catch (error) {
    console.error("Erreur création lien VIP :", error.response?.data || error.message);
  }
}

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running on port " + process.env.PORT);
});
