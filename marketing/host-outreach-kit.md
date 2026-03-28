# Host/Supply Outreach Kit

Goal: convince room owners/co-hosts to let RentFinder mirror their listings so renters always have fresh supply.

## Value prop (use in copy)
- Faster exposure vs. waiting for Facebook group approval
- AI summary auto-generates clean bullets you can forward to applicants
- Listings stay live for 60 days and you can request edits by replying to the onboarding email

## DM / Email templates

### English
```
Kia ora! I’m building RentFinder.nz — it lets students type "Room near UC under $250/week" and instantly see matching rooms. I just saw your post on <group/platform> and wondered if you’d like a free repost.

What you get:
• Your listing copied over with AI-polished highlights
• Direct contact link back to you
• Priority placement when students search your suburb/budget

All I need is the link (Roomies, TradeMe, FB post). Drop it here or fill this quick form: https://www.rentfinder.nz/hosts

Cheers,
Thai — RentFinder
```

### Vietnamese
```
Chào bạn, mình đang dựng RentFinder.nz — nơi sinh viên chỉ cần gõ "phòng gần UC dưới $250/tuần" là ra đúng listing. Thấy bài đăng của bạn trên <group> nên mời bạn cho bọn mình re-post miễn phí.

Lợi ích:
• AI tóm tắt gọn, giúp bạn gửi cho người hỏi nhanh hơn
• Giữ link liên hệ của bạn, không cần tạo tài khoản
• Ưu tiên hiển thị khi người thuê tìm đúng khu vực/ngân sách

Chỉ cần gửi link Roomies/TradeMe/Facebook hoặc điền form: https://www.rentfinder.nz/hosts

Cảm ơn bạn,
Thai — RentFinder
```

## One-pager structure (for landing at /hosts)
1. Hero: "Share your room once, let AI handle the inbox"
2. 3-step timeline: Paste link → AI cleans + adds tags → Live for 60 days
3. FAQ: "Do I need an account?" / "Can I request removal?"
4. CTA button linking to `mailto:info@rentfinder.nz?subject=Share%20my%20listing`

## Workflow checklist (per host)
1. Collect link via DM/form.
2. Run `node scripts/import-roomies-lincoln.mjs <area> 10 --dry-run` if Roomies; otherwise create manual entry via `/post` (logged-in admin).
3. Email confirmation snippet:
```
Subject: Your room is live on RentFinder
Body:
Kia ora <Name>,
Thanks for letting us re-share your listing. Here’s the AI summary + link: <URL>
Need changes? Reply to this email anytime.
```
4. Track leads in spreadsheet (columns: Source group, Owner name, Link, Date mirrored, Status).

## Metrics to watch
- Hosts contacted / week
- Approval rate (mirror OK vs. declined)
- Listings mirrored / week
- % of mirrored listings receiving ≥1 renter contact
