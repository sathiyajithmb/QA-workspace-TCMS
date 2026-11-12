# Docpanel QA User Manual

This guide walks through one complete manual-testing workflow: create a project, write a test case, group it into a test plan, run it in a cycle, and export an execution report.

## Open the application

Open [http://127.0.0.1:8080](http://127.0.0.1:8080) and sign in with your account. For a local development setup, the initial administrator credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

The project selector and workflow pages are in the left navigation. The app saves changes as you use its create, add, and result buttons.

## Permissions at a glance

- **Admin, QA Lead, Test Lead:** can create projects and manage plans and cycles. Admins can also manage user accounts.
- **Project Admin or Lead:** can manage project access, plans, cycles, and cycle case assignments.
- **Project Tester:** can create and edit test cases and execute cases assigned to them.
- **Viewer:** can view project information but cannot change it.

Global Admin, QA Lead, and Test Lead accounts can access all projects. Other users need project membership. A lead or administrator can grant membership from **Projects → Project membership**.

## End-to-end workflow

### 1. Create and select a project

1. Open **Projects**.
2. Under **Create project**, enter a unique project key, name, and description.
   - Keys are 2–40 characters and may contain letters, numbers, `_`, and `-`.
   - For example: key `DEMOQA`, name `Sample Storefront QA`.
3. Click **Save project**. The creator is added to the project automatically.
4. Select the project in the left-hand project selector.

### 2. Create a test case

1. Open **Test Cases** and use **Create test case**.
2. Enter a clear title, then choose a priority, type, and status. Manual cases normally use type **Manual** and status **Active**.
3. Add any setup requirements under **Preconditions**.
4. Enter **Steps as JSON array**. Each step has an `action` and an `expected` result. For example:

   ```json
   [
     {
       "action": "Add an in-stock product to the cart and continue as a guest.",
       "expected": "The cart contains the product and guest checkout opens."
     },
     {
       "action": "Enter valid shipping details and continue to payment.",
       "expected": "The shipping details are accepted and the order total is correct."
     },
     {
       "action": "Submit the order using approved QA payment details.",
       "expected": "An order confirmation and order number are displayed."
     }
   ]
   ```

5. Leave **Custom field values (JSON)** as `{}` unless your project has custom fields to fill in.
6. Click **Create case**. Find the case in the repository table. Its key is shown as `TC-<number>`; use the numeric part when selecting cases for a plan.

Editing a case creates a new version. The version history is available from the case table.

### 3. Create a plan and include cases

1. Open **Plans & Cycles**.
2. Under **Create test plan**, enter a plan name, release, and scope.
3. In **Selected case IDs (comma separated)**, enter the numeric case ID(s) from the Test Cases table. For example, for `TC-12`, enter `12`; for multiple cases, enter `12,13`.
4. Click **Create plan with cases**.
5. In the **Plans** table, click **View** to confirm the included cases.

### 4. Create a test cycle

1. In **Plans & Cycles**, use **Create cycle**.
2. Select the plan, name the cycle, and enter the target environment (for example, `QA staging`). Start and end dates are optional.
3. Click **Create cycle**.

Creating a cycle does **not** automatically put its plan's cases into the cycle. Add the cases explicitly in the next step.

### 5. Add cases to the cycle and execute

1. Open **Execution** and select the cycle in **Cycle setup**.
2. Choose a case from **Add case**. A lead can optionally assign it to a project member; assigned testers can execute their own cases.
3. Click **Add to cycle**. Repeat for each case to run.
4. Under **Manual execution**, review the case preconditions and steps. For every step, select its result and enter the observed step result.
5. Enter the overall **Actual result** and any **Comments**. You may attach PNG, JPEG, WEBP, TXT, or LOG evidence within the configured upload limit.
6. Record the overall outcome with **Passed**, **Failed**, **Blocked**, or **Skipped**. Each click creates an execution attempt; a later retest adds another attempt rather than replacing history.

**Not Run** is the initial cycle state, not an execution attempt. It cannot be submitted as an overall result. Check **Execution attempt history** to review recorded results.

### 6. Review progress and export a report

1. Open **Dashboard** to review case counts, attempts, open defects, cycles, progress, and result statuses. Use the cycle or release filters and click **Apply filter** to narrow the overview.
2. Open **Reports**.
3. Select a cycle to export only its results, or leave **Optional cycle filter** at **All cycles** for the whole project.
4. Click **Export execution report** to download a CSV. The report contains execution ID, case ID, cycle ID, result, source, user ID, and timestamp.
5. To export project defects instead, click **Export defect report**.

Reports are CSV exports of recorded executions and defects; the app does not generate a PDF or a separate plan-summary report. The execution report includes only cases with execution attempts, not cases still marked Not Run.

## Sample workflow in this workspace

The running app includes a demonstration project and data to explore:

- **Project:** `DEMOQA` — Sample Storefront QA
- **Test case:** Guest checkout with valid payment
- **Plan:** Checkout smoke coverage - 2026.10
- **Cycle:** 2026.10 checkout smoke - QA staging
- **Result:** One sample Passed execution

The CSV export for that cycle is available at [sample-test-execution-report.csv](./sample-test-execution-report.csv). Its Passed result is demonstration data only; replace it with results from an actual test run before using reports for release decisions.

## Common issues

- **No project selected:** create a project or ask an administrator to grant project access, then select the project in the left navigation.
- **Insufficient permissions:** ask an administrator or project lead for the project role needed for the action.
- **Invalid test-case steps:** confirm the steps field contains valid JSON and each step has `action` and `expected` text.
- **A case is missing from Execution:** add it to the selected cycle using **Cycle setup → Add case**. Plan membership alone does not add it to a cycle.
- **A tester cannot submit a result:** ask a lead to assign that cycle case to the tester.
- **An execution is absent from a cycle-filtered report:** confirm the execution belongs to the selected cycle and has been recorded as an attempt.
