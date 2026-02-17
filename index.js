const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

/* =========================
   TELEGRAM WEBHOOK
========================= */

app.post("/telegram", async (req, res) => {
  const message = req.body.message;

  if (!message || !message.text) {
    return res.sendStatus(200);
  }

  const chatId = message.chat.id;
  const text = message.text;

  try {

    // 🔹 1 SEMAINE
    if (text.startsWith("/week")) {

      const payment = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        {
          price_amount: 10,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id: String(chatId),
          order_description: "7days"
        },
        {
          headers: {
            "x-api-key": NOWPAYMENTS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `💳 Abonnement 1 semaine (10 USDT) :\n${payment.data.invoice_url}`,
      });

      return res.sendStatus(200);
    }

    // 🔹 1 MOIS
    if (text.startsWith("/month")) {

      const payment = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        {
          price_amount: 30,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id: String(chatId),
          order_description: "30days"
        },
        {
          headers: {
            "x-api-key": NOWPAYMENTS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `💳 Abonnement 1 mois (30 USDT) :\n${payment.data.invoice_url}`,
      });

      return res.sendStatus(200);
    }

    // 🔹 START (menu simple)
    if (text.startsWith("/start")) {

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `Bienvenue 👑

Choisis ton abonnement :

/week → 1 semaine (10 USDT)
/month → 1 mois (30 USDT)`
      });

      return res.sendStatus(200);
    }

  } catch (error) {
    console.error("Erreur Telegram :", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

/* =========================
   NOWPAYMENTS WEBHOOK
========================= */

app.post("/payment", async (req, res) => {

  const payment = req.body;

  if (payment.payment_status !== "finished") {
    return res.sendStatus(200);
  }

  const userId = payment.order_id;

  try {

    // 🔒 Vérifier si déjà membre du canal
    const memberCheck = await axios.get(
      `${TELEGRAM_API}/getChatMember`,
      {
        params: {
          chat_id: CHANNEL_ID,
          user_id: userId
        }
      }
    );

    const status = memberCheck.data.result.status;

    if (status === "member" || status === "administrator" || status === "creator") {
      console.log("Utilisateur déjà abonné :", userId);
      return res.sendStatus(200);
    }

  } catch (err) {
    // S'il n'est pas membre, Telegram renvoie une erreur → normal
  }

  try {

    // 🎟️ Créer lien unique
    const invite = await axios.post(
      `${TELEGRAM_API}/createChatInviteLink`,
      {
        chat_id: CHANNEL_ID,
        member_limit: 1
      }
    );

    const inviteLink = invite.data.result.invite_link;

    // 📩 Envoyer accès VIP
    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      {
        chat_id: userId,
        text: `✅ Paiement confirmé !

Voici ton accès VIP :
${inviteLink}

⚠️ Lien valable une seule fois`
      }
    );

    console.log("Accès VIP envoyé à", userId);

  } catch (error) {
    console.error("Erreur paiement :", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

/* ========================= */

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running");
});
