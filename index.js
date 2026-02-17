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

    // 🔹 START → Menu avec bouton promo
    if (text.startsWith("/start")) {

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `🔥 ACCÈS VIP À VIE 🔥

Prix normal : ~~45 USDT~~
🎉 Promo actuelle : 30 USDT

⚠️ Offre limitée.

Clique sur le bouton ci-dessous pour accéder au canal VIP.`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Profiter de la promo (30 USDT)",
                callback_data: "buy_vip"
              }
            ]
          ]
        }
      });

      return res.sendStatus(200);
    }

  } catch (error) {
    console.error("Erreur Telegram :", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

/* =========================
   CALLBACK BUTTON HANDLER
========================= */

app.post("/telegram", async (req, res) => {

  const callback = req.body.callback_query;

  if (!callback) {
    return res.sendStatus(200);
  }

  const chatId = callback.message.chat.id;

  if (callback.data === "buy_vip") {

    try {

      const payment = await axios.post(
        "https://api.nowpayments.io/v1/invoice",
        {
          price_amount: 30,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id: String(chatId),
          order_description: "lifetime"
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
        text: `💳 Paiement sécurisé :

${payment.data.invoice_url}

Après confirmation, tu recevras ton accès VIP à vie.`
      });

    } catch (error) {
      console.error("Erreur paiement :", error.response?.data || error.message);
    }
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

    // 🔒 Vérifier si déjà membre
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
      console.log("Déjà membre :", userId);
      return res.sendStatus(200);
    }

  } catch (err) {
    // Normal si pas membre
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

    // 📩 Envoyer accès
    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      {
        chat_id: userId,
        text: `✅ Paiement confirmé !

🎉 Bienvenue dans le VIP.

Voici ton accès à vie :
${inviteLink}

⚠️ Lien valable une seule fois`
      }
    );

    console.log("Accès envoyé à", userId);

  } catch (error) {
    console.error("Erreur accès VIP :", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

/* ========================= */

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running");
});
