// Fictional employee handbook for a made-up company. The repository is public, so no real
// client policy text may ever be placed here; a real deployment loads policies privately.
export interface PolicySection {
  heading: string
  text: string
}

export interface Policy {
  id: string
  title: string
  updated: string
  sections: PolicySection[]
}

export const COMPANY = 'Northgate Realty'

export const HANDBOOK: Policy[] = [
  {
    id: 'pto',
    title: 'Paid Time Off',
    updated: '2026-01-15',
    sections: [
      {
        heading: 'Vacation accrual',
        text: 'Full-time employees accrue vacation days based on years of service: 15 days per year in years 1–3, 20 days per year in years 4–7, and 25 days per year from year 8. Part-time employees accrue vacation in proportion to their scheduled hours.',
      },
      {
        heading: 'Carryover',
        text: 'Up to 5 unused vacation days carry over into the next calendar year. Carried-over days must be used by March 31 or they expire. Unused vacation is not paid out except where required by state law.',
      },
      {
        heading: 'Requesting time off',
        text: 'Request vacation in the HR portal at least two weeks in advance. Requests of five or more consecutive days need manager approval at least four weeks ahead. During the spring listing season (April–June), agents should coordinate time off with their team lead.',
      },
    ],
  },
  {
    id: 'holidays',
    title: 'Company Holidays',
    updated: '2026-01-15',
    sections: [
      {
        heading: 'Observed holidays',
        text: "The company observes 11 paid holidays: New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving and the day after, Christmas Eve and Christmas Day.",
      },
      {
        heading: 'Floating holidays',
        text: 'Each employee receives 2 floating holidays per calendar year to use for personal, cultural or religious observances of their choice. Floating holidays do not carry over.',
      },
    ],
  },
  {
    id: 'sick',
    title: 'Sick Time',
    updated: '2026-02-01',
    sections: [
      {
        heading: 'Sick days',
        text: 'Employees receive 8 paid sick days per year, available from the first day of employment. Sick days may be used for your own illness, medical appointments, or to care for a sick family member.',
      },
      {
        heading: 'Notice and documentation',
        text: 'Tell your manager as early as possible on the day you are sick. A doctor’s note is only requested for absences of more than three consecutive workdays.',
      },
    ],
  },
  {
    id: 'remote',
    title: 'Remote and Hybrid Work',
    updated: '2026-03-10',
    sections: [
      {
        heading: 'Eligibility',
        text: 'Corporate office staff may work from home up to 2 days per week with manager approval. Property management and leasing staff work on site because their roles require being at the property.',
      },
      {
        heading: 'Equipment and stipend',
        text: 'Hybrid employees receive a one-time $300 home office stipend and a company laptop. Monthly internet costs are not reimbursed.',
      },
      {
        heading: 'Working from another state',
        text: 'Working remotely from another state for more than 10 business days in a year requires HR approval in advance because of tax and licensing rules.',
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Travel and Expense Reimbursement',
    updated: '2026-01-20',
    sections: [
      {
        heading: 'Mileage',
        text: 'Mileage driven in a personal vehicle for showings, inspections and client meetings is reimbursed at the current IRS standard rate. Commuting between home and your regular office is not reimbursable.',
      },
      {
        heading: 'Submitting expenses',
        text: 'Submit expense reports in the expense app within 30 days of the expense, with an itemized receipt for anything over $25. Reports are reimbursed with the next payroll after manager approval.',
      },
      {
        heading: 'Client meals',
        text: 'Client meals are reimbursed up to $75 per person including tip. Alcohol is not reimbursable unless pre-approved by a regional director.',
      },
    ],
  },
  {
    id: 'benefits',
    title: 'Health and Retirement Benefits',
    updated: '2026-01-05',
    sections: [
      {
        heading: 'Eligibility and enrollment',
        text: 'Employees working 30 or more hours per week are eligible for medical, dental and vision coverage starting the first of the month after their start date. Open enrollment runs every year from November 1 to November 15.',
      },
      {
        heading: 'Life events',
        text: 'Changes outside open enrollment are allowed within 30 days of a qualifying life event such as marriage, birth or adoption of a child, or loss of other coverage. Submit the change in the benefits portal with supporting documents.',
      },
      {
        heading: '401(k) plan',
        text: 'Employees can join the 401(k) plan after 60 days of employment. The company matches 100% of the first 4% of salary you contribute. The company match vests over 3 years.',
      },
    ],
  },
  {
    id: 'learning',
    title: 'Professional Development and Licensing',
    updated: '2026-02-12',
    sections: [
      {
        heading: 'Tuition and courses',
        text: 'The company reimburses up to $1,500 per calendar year for approved job-related courses and certifications. Get approval from your manager before enrolling and submit proof of completion.',
      },
      {
        heading: 'Real estate license renewal',
        text: 'For licensed agents, the company pays real estate license renewal fees and required continuing education courses. Submit the renewal receipt through the expense app.',
      },
    ],
  },
  {
    id: 'conduct',
    title: 'Code of Conduct',
    updated: '2026-01-10',
    sections: [
      {
        heading: 'Dress code',
        text: 'Office dress is business casual. For property showings and client meetings, wear business attire and your Northgate name badge. Jeans are fine on Fridays when you have no client appointments.',
      },
      {
        heading: 'Gifts from clients and vendors',
        text: 'You may accept gifts from clients or vendors worth up to $100 per year from the same source. Cash or gift cards of any amount must be declined. Report anything above the limit to your manager.',
      },
      {
        heading: 'Conflicts of interest',
        text: 'Disclose to Compliance before you buy, sell or lease a property listed by Northgate, or represent a family member in a transaction.',
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    updated: '2026-01-05',
    sections: [
      {
        heading: 'Pay schedule',
        text: 'Employees are paid every other Friday by direct deposit. Pay stubs are available in the HR portal. If a payday falls on a holiday, pay arrives on the prior business day.',
      },
      {
        heading: 'Commission payments',
        text: 'Agent commissions are paid on the payroll after the transaction closes and the funds are received by Northgate, normally within 10 business days of closing.',
      },
      {
        heading: 'Direct deposit changes',
        text: 'Update your bank details in the HR portal. Changes made at least five business days before payday take effect that payday.',
      },
    ],
  },
  {
    id: 'parental',
    title: 'Parental Leave',
    updated: '2026-03-01',
    sections: [
      {
        heading: 'Paid parental leave',
        text: 'After 6 months of employment, employees receive 12 weeks of paid parental leave following the birth, adoption or foster placement of a child. Leave must be taken within 12 months of the event.',
      },
      {
        heading: 'Requesting leave',
        text: 'Notify HR at least 30 days before your expected leave date when possible. HR will explain how parental leave interacts with any job-protected leave you may be eligible for.',
      },
    ],
  },
]
