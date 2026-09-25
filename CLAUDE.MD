# White Space Workshop — ERP system

## Project context

Internal ERP for White Space Workshop, an interior design + graphic design + social media agency studio. Manages leads, quotations, clients, projects, tasks, design file approvals, services, and personal to-do lists. Three fixed roles: Super Admin, Admin, Employee. No client-facing login for now (schema is designed so one can be added later without a rebuild).

## Tech stack

- **Framework**: Next.js 14+ (App Router), TypeScript, React — one app for frontend and backend, no separate API service
- **Backend**: Next.js Route Handlers + Server Actions
- **ORM**: Prisma
- **Database**: MySQL, hosted on Aiven (free tier to start)
- **Auth**: NextAuth.js (Auth.js) v5, Credentials provider, JWT session strategy, role embedded in the token
- **UI**: Tailwind CSS + shadcn/ui
- **File storage**: Cloudinary (design file uploads, versions, thumbnails)
- **Email**: Resend (payment/deadline reminders)
- **Hosting**: Vercel
- **Validation**: Zod, shared between client and server

## Auth & role rules

- Three roles on the `User` model: `SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`.
- Anyone can sign up at `/signup`. Sign-up always creates an `EMPLOYEE` with `status: 'pending'` — never trust a role from that form. A pending account can't sign in until a Super Admin approves it on `/dashboard/team`; login says so only once the password has checked out, so the page can't be used to discover which emails exist.
- `User.status` is one of `pending` (awaiting approval), `active`, `inactive` (deactivated). Only `active` may sign in.
- Role and status changes live on `/dashboard/team` (Super Admin only). Two locks in `updateUser`: nobody changes their own role or status, and the last active Super Admin can't be demoted or deactivated.
- `prisma/seed.ts` creates exactly one account: the Super Admin. Everyone else signs up or is added from Team & Roles.
- Passwords: everyone changes their own at `/dashboard/settings` (current password required; `changeOwnPassword` takes the user id from the session, never the form). Someone locked out is given a temporary password by a Super Admin from Team & Roles (`resetUserPassword`). There is no email-based reset.
- `/dashboard/settings` is each user's own account, so **all three roles** reach it — it is not Super Admin only.
- `Project.projectValue` is **Super Admin only** — stripped server-side in `listProjects`, `getProjectDetail`, `getClientDetail` and the dashboard, and the field is hidden in the project form, so it never reaches an Admin's or Team member's browser.
- **Deleting is a soft delete.** `Task`, `Todo` and `Client` carry `deletedAt` + `deletedById`; `deleteTask`, `deleteTodo` and `deleteClient` set them instead of removing the row, and **every** query filters `deletedAt: null` (lists, counts, `lib/scope.ts`, the dashboard, the overdue-todo check). `/dashboard/recycle-bin` (Super Admin only) restores an item or deletes it for good — `purgeItem`/`emptyRecycleBin` in `lib/actions/recycle-bin.ts` are the only real deletes, and they only ever touch rows already in the bin. `deleteClient` (Admin+) refuses while the client still has projects or quotations — those can't be deleted on their own, so removing the client would orphan them. Any new deletable model should follow the same pattern and be added to the bin.
- A task can be assigned to **several people**: `TaskAssignee` (join table), not a column on `Task`. `setTaskAssignees` replaces the whole list in one call, and anyone can assign. Team members' Tasks board shows tasks assigned to them (`assignees.some(userId)`).
- Quotations are Admin+ only: the nav links, the routes (`/dashboard/quotations/*` and `/print/quotations/*`), every action in `lib/actions/quotations.ts`, and the "New quotation" button on a client's page all exclude Employees.
- `/dashboard/activity` is Super Admin only: it lists task phase moves (who, from → to, date and time) from `ActivityLog`. `updateTaskStatus` writes one row per real move — a drag that lands back on the same phase records nothing. The dashboard's "Recent activity" widget follows the same rule.
- `proxy.ts` protects every `/dashboard/*` and `/print/*` route. Unauthenticated users redirect to `/login`.
- Role gates access:
  - **Employee** (shown in the UI as **Team**; the stored role stays `EMPLOYEE`): cannot reach Team & Roles, Activity Log or Quotations (including a quotation's print/PDF page). There is no Reports page.
  - Clients and Projects are **shared with everyone** — a client or project added by one person is visible to all roles. Only the Tasks board stays personal (tasks assigned to you), and a project's value is Super Admin only.
  - Employees **can** assign any task they can see to anyone on the team (`assignTask`, `listAssignableUsers`), and set an assignee when creating one. Deleting a task, and editing a task that isn't theirs, stay Admin+ — that's the `canDelete` prop, separate from `canAssign`. Projects/Tasks views are scoped to their own assignments only.
  - **Admin**: cannot reach Team & Roles or Activity Log, and never sees a project's value. Everything else is full access.
  - **Super Admin**: full access to everything.
- Sidebar and page-level checks both enforce this — don't rely on hiding a nav link alone; guard the route handlers/server actions too.

## Folder structure

```
white-space-workshop/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # sidebar + topbar shell
│   │   ├── dashboard/page.tsx
│   │   ├── leads/
│   │   ├── quotations/
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── services/
│   │   ├── todos/
│   │   └── team/
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── webhooks/
├── lib/
│   ├── actions/                # leads.ts, quotations.ts, clients.ts, projects.ts, tasks.ts, services.ts, todos.ts, team.ts
│   ├── auth.ts                 # NextAuth config, role helpers
│   ├── db.ts                   # Prisma client singleton
│   └── validations/            # Zod schemas
├── components/
│   ├── ui/                     # shadcn components
│   └── modules/                # feature-specific components
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
└── package.json
```

## Database schema

This mirrors `prisma/schema.prisma`, which is the source of truth — change the schema there (via a migration) and keep this copy in sync.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  ADMIN
  EMPLOYEE
}

enum LeadStatus {
  NEW
  CONTACTED
  QUOTATION
  WON
  LOST
}

enum QuotationStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
}

enum ProjectType {
  INTERIOR
  BRANDING
  SOCIAL
  WEB
}

enum ProjectStatus {
  BRIEF
  CONCEPT
  DRAFT
  REVISION
  FINAL
  DELIVERED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum ApprovalStatus {
  PENDING
  APPROVED
  CHANGES_REQUESTED
}

enum ReminderStatus {
  UPCOMING
  DUE_TODAY
  OVERDUE
  DONE
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(EMPLOYEE)
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  leadsAssigned      Lead[]            @relation("LeadAssignee")
  clientsCreated     Client[]
  quotationsCreated  Quotation[]
  projectsCreated    Project[]
  projectAssignments ProjectAssignee[]
  taskAssignments    TaskAssignee[]
  filesUploaded      ProjectFile[]
  reminders          Reminder[]
  activityLogs       ActivityLog[]
  notifications      Notification[]
  servicesCreated    Service[]
  todos              Todo[]
  clientsDeleted     Client[]          @relation("ClientDeletedBy")
  tasksDeleted       Task[]            @relation("TaskDeletedBy")
  todosDeleted       Todo[]            @relation("TodoDeletedBy")
}

model Client {
  id          String   @id @default(cuid())
  name        String
  companyName String?
  email       String?
  phone       String?
  address     String?
  notes       String?  @db.Text
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime @default(now())

  /// Soft delete — see Task.deletedAt. A client can only be deleted once it
  /// has no projects or quotations left.
  deletedAt   DateTime?
  deletedBy   User?     @relation("ClientDeletedBy", fields: [deletedById], references: [id])
  deletedById String?

  leads      Lead[]
  quotations Quotation[]
  projects   Project[]

  @@index([deletedAt])
}

model Lead {
  id           String     @id @default(cuid())
  name         String
  phone        String?
  email        String?
  service      String
  budget       Decimal?   @db.Decimal(12, 2)
  followUpDate DateTime?
  status       LeadStatus @default(NEW)
  client       Client?    @relation(fields: [clientId], references: [id])
  clientId     String?
  assignedTo   User?      @relation("LeadAssignee", fields: [assignedToId], references: [id])
  assignedToId String?
  createdAt    DateTime   @default(now())
}

model Quotation {
  id              String          @id @default(cuid())
  quotationNumber String          @unique
  /// Who the quotation is for — typed by hand, printed on the PDF.
  clientName      String
  /// Set only when the quotation is accepted and the user picks the (manually
  /// created) client its project belongs to.
  client          Client?         @relation(fields: [clientId], references: [id])
  clientId        String?
  status          QuotationStatus @default(DRAFT)
  reference       String?
  /// The date printed on the quotation. Defaults to creation, editable later.
  quotationDate   DateTime        @default(now())
  /// Flat ₹ amount, taken off the subtotal. Set from the edit form only.
  discount        Decimal         @default(0) @db.Decimal(12, 2)
  totalAmount     Decimal         @default(0) @db.Decimal(12, 2)
  terms           String?         @db.Text
  createdBy       User            @relation(fields: [createdById], references: [id])
  createdById     String
  createdAt       DateTime        @default(now())

  items    QuotationItem[]
  projects Project[]
}

model QuotationItem {
  id          String    @id @default(cuid())
  quotation   Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  quotationId String
  description String
  quantity    Int       @default(1)
  rate        Decimal   @db.Decimal(12, 2)
  amount      Decimal   @db.Decimal(12, 2)
  service     Service?  @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  serviceId   String?
}

/// Work the studio offers repeatedly. Named once, then reused on tasks and
/// quotation line items. Retired services (isActive = false) stay linked to
/// existing records but drop out of the pickers.
model Service {
  id          String   @id @default(cuid())
  name        String
  description String?  @db.Text
  isActive    Boolean  @default(true)
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tasks          Task[]
  quotationItems QuotationItem[]
}

model Project {
  id           String        @id @default(cuid())
  client       Client        @relation(fields: [clientId], references: [id])
  clientId     String
  quotation    Quotation?    @relation(fields: [quotationId], references: [id])
  quotationId  String?
  title        String
  type         ProjectType
  status       ProjectStatus @default(BRIEF)
  projectValue Decimal?      @db.Decimal(12, 2)
  createdBy    User          @relation(fields: [createdById], references: [id])
  createdById  String
  startDate    DateTime?
  deadline     DateTime?
  createdAt    DateTime      @default(now())

  assignees ProjectAssignee[]
  tasks     Task[]
  files     ProjectFile[]
  approvals ClientApproval[]
  revisions Revision[]
}

model ProjectAssignee {
  id         String   @id @default(cuid())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId  String
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  assignedAt DateTime @default(now())

  @@unique([projectId, userId])
}

model Task {
  id              String     @id @default(cuid())
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId       String
  title           String
  description     String?    @db.Text
  priority        Priority   @default(MEDIUM)
  status          TaskStatus @default(TODO)
  progressPercent Int        @default(0)
  dueDate         DateTime?
  createdAt       DateTime   @default(now())

  /// Soft delete: set when someone deletes the task, so it moves to the
  /// recycle bin instead of vanishing. Every query filters on it.
  deletedAt   DateTime?
  deletedBy   User?     @relation("TaskDeletedBy", fields: [deletedById], references: [id])
  deletedById String?

  /// A task can be shared — see TaskAssignee.
  assignees TaskAssignee[]
  service   Service?       @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  serviceId String?

  @@index([deletedAt])
}

/// Who is working on a task. A task can be assigned to several people, so
/// this is a join table rather than a column on Task.
model TaskAssignee {
  id         String   @id @default(cuid())
  task       Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  taskId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  assignedAt DateTime @default(now())

  @@unique([taskId, userId])
  @@index([userId])
}

model ProjectFile {
  id             String         @id @default(cuid())
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId      String
  uploadedBy     User           @relation(fields: [uploadedById], references: [id])
  uploadedById   String
  fileUrl        String
  fileType       String?
  version        Int            @default(1)
  approvalStatus ApprovalStatus @default(PENDING)
  createdAt      DateTime       @default(now())

  approvals ClientApproval[]
}

model ClientApproval {
  id         String         @id @default(cuid())
  project    Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId  String
  file       ProjectFile?   @relation(fields: [fileId], references: [id])
  fileId     String?
  itemType   String
  status     ApprovalStatus @default(PENDING)
  reviewedAt DateTime?
  notes      String?        @db.Text
}

model Revision {
  id             String   @id @default(cuid())
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId      String
  itemType       String
  revisionNumber Int      @default(1)
  revisionLimit  Int      @default(3)
  createdAt      DateTime @default(now())
}

model Reminder {
  id                String         @id @default(cuid())
  type              String
  relatedEntityType String?
  relatedEntityId   String?
  dueDate           DateTime
  status            ReminderStatus @default(UPCOMING)
  assignedTo        User           @relation(fields: [assignedToId], references: [id])
  assignedToId      String
  createdAt         DateTime       @default(now())
}

model ActivityLog {
  id         String   @id @default(cuid())
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())
}

model Notification {
  id                String   @id @default(cuid())
  user              User     @relation(fields: [userId], references: [id])
  userId            String
  message           String
  isRead            Boolean  @default(false)
  relatedEntityType String?
  relatedEntityId   String?
  createdAt         DateTime @default(now())
}

/// A personal to-do. Unlike Task it belongs to no project — each user keeps
/// their own list and only ever sees their own items.
model Todo {
  id                String    @id @default(cuid())
  name              String
  description       String?   @db.Text
  deadline          DateTime
  isDone            Boolean   @default(false)
  completedAt       DateTime?
  /// Set once the Super Admins have been told this todo went past its
  /// deadline unfinished — guarantees one reminder per todo, never repeats.
  overdueNotifiedAt DateTime?
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  /// Soft delete — see Task.deletedAt.
  deletedAt   DateTime?
  deletedBy   User?     @relation("TodoDeletedBy", fields: [deletedById], references: [id])
  deletedById String?

  @@index([userId, isDone, deadline])
  @@index([deletedAt])
}
```

Notes on the schema:
- Money fields use `Decimal` with `@db.Decimal(12, 2)` for exact precision — never `Float` for currency.
- `Project.quotationId` is nullable — a project doesn't have to originate from a quotation.
- `Quotation.reference` records who referred the enquiry. It is nullable by design: a value means the work came in through a referral, `NULL` means a direct client. It lives only on `Quotation` — a Project inherits its origin through `Project.quotationId`.
- Budget/purchase/profit tracking (`BudgetCategory`, `Purchase`) is intentionally **not** in this schema yet — deferred by request. Don't add it unless asked.
- The payment ledger (`LedgerEntry`) was removed by request on 2026-09-18 — page, dashboard widgets, client balances and the table itself. Don't re-add it unless asked.

## Phase 1 — what to build first

1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router, in the current repo (check the existing `package.json` first — clean up any leftover Vite artifacts like `.vite/` if this repo was previously scaffolded with something else).
2. Install and configure Prisma; use the schema above as `prisma/schema.prisma`.
3. Set up an Aiven MySQL free-tier instance (or ask the user for an existing `DATABASE_URL` if they've already created one) and run the first migration.
4. Install and configure shadcn/ui with Tailwind.
5. Set up NextAuth.js with a Credentials provider, role stored in the JWT, and `middleware.ts` enforcing the role rules above.
6. Build the `/login` page and a minimal authenticated `/dashboard` page as a smoke test — confirm login works and role shows correctly before moving to any feature module.
7. Seed the database (`prisma/seed.ts`) with one user per role for testing.

Do not build any feature module (leads, projects, etc.) until steps 1–7 are working end to end.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
