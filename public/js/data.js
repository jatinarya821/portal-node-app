export const cases = [
  {
    id: 'C-2026-001',
    title: 'State vs Arvind Kumar',
    type: 'Criminal',
    status: 'Hearing Scheduled',
    court: 'Courtroom 2',
    judge: 'Justice R. Sharma',
    petitioner: 'State',
    respondent: 'Arvind Kumar',
    filedOn: '2026-03-08',
    summary: 'Alleged financial fraud involving public tenders.'
  },
  {
    id: 'C-2026-014',
    title: 'Maya Devi vs Municipal Board',
    type: 'Civil',
    status: 'Under Review',
    court: 'Courtroom 4',
    judge: 'Justice A. Menon',
    petitioner: 'Maya Devi',
    respondent: 'Municipal Board',
    filedOn: '2026-03-20',
    summary: 'Dispute over compensation and land record correction.'
  },
  {
    id: 'C-2026-022',
    title: 'Rohan Industries Tax Appeal',
    type: 'Tax',
    status: 'Adjourned',
    court: 'Courtroom 1',
    judge: 'Justice P. Rao',
    petitioner: 'Rohan Industries',
    respondent: 'Tax Department',
    filedOn: '2026-02-11',
    summary: 'Appeal against revised tax order and penalty.'
  }
]

export const hearings = [
  {
    id: 'H-1101',
    caseId: 'C-2026-001',
    date: '2026-04-22',
    time: '11:30',
    status: 'Scheduled',
    courtroom: 'Courtroom 2'
  },
  {
    id: 'H-1102',
    caseId: 'C-2026-014',
    date: '2026-04-25',
    time: '10:00',
    status: 'Scheduled',
    courtroom: 'Courtroom 4'
  },
  {
    id: 'H-1059',
    caseId: 'C-2026-022',
    date: '2026-04-02',
    time: '14:15',
    status: 'Adjourned',
    courtroom: 'Courtroom 1'
  }
]

export const documents = [
  {
    id: 'D-890',
    caseId: 'C-2026-001',
    name: 'Charge_Sheet.pdf',
    category: 'Filing',
    uploadedBy: 'Court Clerk',
    uploadedOn: '2026-04-10'
  },
  {
    id: 'D-891',
    caseId: 'C-2026-014',
    name: 'Land_Record_Annexure.pdf',
    category: 'Evidence',
    uploadedBy: 'Petitioner Counsel',
    uploadedOn: '2026-04-12'
  },
  {
    id: 'D-892',
    caseId: 'C-2026-022',
    name: 'Tax_Order_Copy.pdf',
    category: 'Order',
    uploadedBy: 'Registry',
    uploadedOn: '2026-04-06'
  }
]
