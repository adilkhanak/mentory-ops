# Mentory Ops — Tech Orda 2026

Приватная система отбора кандидатов, которая заменяет рабочую Google-таблицу: карточки кандидатов, CV-проверка, мотивационные письма, интервью, решения, аудит и импорт Excel.

## Параметры цикла

- Junior Frontend Developer — 21 место
- Middle Frontend Engineer — 23 места
- Региональный минимум — 30%
- Дедлайн мотивации — 17.09.2026
- Calendly задаётся отдельно в карточке каждого кандидата

## Развёртывание

1. Импортируйте этот репозиторий в том же Vercel team, где уже создан ресурс Supabase `mentory-ops`.
2. В Vercel откройте проект → Storage/Marketplace → Connect и подключите существующий ресурс `mentory-ops`. Переменные Supabase и PostgreSQL добавятся автоматически.
3. Добавьте IMAP-переменные и `CRON_SECRET` из `.env.example` в Vercel → Project Settings → Environment Variables.
4. В Supabase Auth → URL Configuration укажите Vercel-домен как Site URL и добавьте `https://ваш-домен/auth/callback` в Redirect URLs.
5. Выполните Redeploy и войдите через magic link на `info@mentory.pro`.

База `mentory-ops` уже содержит схему и актуальные 180 заявок. `supabase/schema.sql` нужен только для восстановления или развёртывания отдельного чистого Supabase-проекта.

Для подключения Supabase к Vercel нужны:

```dotenv
POSTGRES_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Для синхронизации почты:

```dotenv
IMAP_HOST=mentory.pro
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=info@mentory.pro
IMAP_PASSWORD=...
CRON_SECRET=длинная-случайная-строка
```

Пароли и ключи нельзя добавлять в Git. `.env*` уже исключены, кроме безопасного шаблона `.env.example`.

## Работа с кандидатами

- `/applications` — реестр, фильтры, ручное добавление и редактирование кандидатов.
- `/teacher` — очередь CV: данные кандидата, PDF и решение на одном экране.
- `/mail` — сообщения, сопоставление с кандидатом и ручной запуск IMAP-синхронизации.
- `/import` — повторяемый импорт `.xls`, `.xlsx` или `.csv` без дублей по ИИН/email.
- `/audit` — история изменений.

Автоматическая проверка почты запускается ежедневно через `vercel.json`; кнопку синхронизации можно использовать в любое время.

## Локальный запуск

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Требуется Node.js 22. Схема PostgreSQL хранится в `supabase/schema.sql`.
