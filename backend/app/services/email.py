"""Service d'envoi d'emails (bienvenue employé, etc.)."""

from __future__ import annotations

import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_welcome_html(first_name: str, email: str, password: str, app_url: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F7FF;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7FF;padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(108,92,231,0.10);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6C5CE7,#5A4BD1);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">\U0001F4E6 GestMat</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Gestion de mat\u00e9riel simplifi\u00e9e</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <h2 style="margin:0 0 16px;color:#333;font-size:20px;">Bienvenue {first_name}\u00a0! \U0001F44B</h2>
            <p style="margin:0 0 16px;color:#666;font-size:15px;line-height:1.6;">
              Votre compte a \u00e9t\u00e9 cr\u00e9\u00e9 sur l\u2019application de gestion de mat\u00e9riel de votre entreprise.
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td style="background:#F8F7FF;border-radius:12px;padding:20px 24px;border:1px solid #E8E5FF;">
                <p style="margin:0 0 8px;color:#6C5CE7;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                  Vos identifiants de connexion
                </p>
                <p style="margin:0 0 6px;color:#333;font-size:15px;">
                  \U0001F4E7 <strong>Email :</strong> {email}
                </p>
                <p style="margin:0;color:#333;font-size:15px;">
                  \U0001F512 <strong>Mot de passe :</strong> <code style="background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #ddd;font-size:14px;">{password}</code>
                </p>
              </td></tr>
            </table>

            <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
              Installez l\u2019application sur votre t\u00e9l\u00e9phone pour scanner les QR codes et
              consulter le mat\u00e9riel facilement.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="{app_url}"
                   style="display:inline-block;background:#6C5CE7;color:#ffffff;
                          text-decoration:none;padding:14px 32px;border-radius:12px;
                          font-size:16px;font-weight:600;">
                  \U0001F4F1 Ouvrir l\u2019application
                </a>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.5;">
              <strong>Sur iPhone :</strong> Ouvrez le lien dans Safari, appuyez sur
              <em>Partager</em> puis <em>\u00ab\u00a0Sur l\u2019\u00e9cran d\u2019accueil\u00a0\u00bb</em>.<br>
              <strong>Sur Android :</strong> Ouvrez le lien dans Chrome, appuyez sur
              le menu \u22ee puis <em>\u00ab\u00a0Installer l\u2019application\u00a0\u00bb</em>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 24px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;color:#bbb;font-size:12px;">
              Swiss Work Together \u2014 Gestion de mat\u00e9riel
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_email(to: str, subject: str, html: str) -> None:
    """Envoie un email via SMTP (bloquant — appeler depuis un thread)."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP non configur\u00e9, email non envoy\u00e9 \u00e0 %s", to)
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email envoy\u00e9 \u00e0 %s", to)
    except Exception:
        logger.exception("\u00c9chec envoi email \u00e0 %s", to)


def send_welcome_email(to: str, first_name: str, password: str) -> None:
    """Envoie le mail de bienvenue avec identifiants en arri\u00e8re-plan (non-bloquant)."""
    app_url = settings.FRONTEND_BASE_URL
    html = _build_welcome_html(first_name, to, password, app_url)
    subject = f"Bienvenue sur GestMat, {first_name}\u00a0!"

    thread = threading.Thread(
        target=_send_email,
        args=(to, subject, html),
        daemon=True,
    )
    thread.start()
