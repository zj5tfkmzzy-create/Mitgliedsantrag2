import nodemailer from "nodemailer";
import Busboy from "busboy";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {

  // ✅ CORS (einfach & funktioniert)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Nur POST erlauben
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    // 📄 PDF auslesen
    const busboy = Busboy({ headers: req.headers });
    let fileBuffer = null;

    await new Promise((resolve, reject) => {
      busboy.on("file", (fieldname, file) => {
        const chunks = [];
        file.on("data", (data) => chunks.push(data));
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on("finish", resolve);
      busboy.on("error", reject);

      req.pipe(busboy);
    });

    if (!fileBuffer) {
      return res.status(400).json({ ok: false });
    }

    // 📧 Mail (Goneo)
    const transporter = nodemailer.createTransport({
      host: "mail.goneo.de",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Mitgliedsantrag" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject: "Neuer Mitgliedsantrag",
      text: "Im Anhang befindet sich der Antrag als PDF.",
      attachments: [
        {
          filename: "mitgliedsantrag.pdf",
          content: fileBuffer,
        },
      ],
    });

    res.status(200).json({ ok: true });

  } catch (err) {
    console.error("FEHLER:", err);
    res.status(500).json({ ok: false });
  }
}
