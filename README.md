# WhatsApp Lead Assistant Bot

An AI-powered WhatsApp lead generation and management system built for Dream Axis Travel Solutions. The bot collects lead information through natural conversations, schedules meetings, sends automated reminders, and generates daily reports.

Built with Node.js, Express, and the Twilio WhatsApp Business API. Uses OpenAI GPT for conversational intelligence.

## What it does

- Collects lead data (name, email, phone, country, service interest) through natural WhatsApp conversations powered by OpenAI GPT
- Generates personalized Calendly booking links for each lead
- Sends automated WhatsApp reminders 5 hours and 1 hour before scheduled meetings
- Produces daily PDF and Excel reports of all conversations, delivered via email
- Stores lead data in Google Sheets with AES-256 encryption on sensitive fields
- Validates incoming webhooks with Twilio signature verification
- Includes rate limiting and comprehensive logging

## Tech stack

Node.js, Express, Twilio WhatsApp Business API, OpenAI GPT, Calendly API, Google Sheets API, ExcelJS, PDFKit, Nodemailer, Winston, AES-256 encryption
