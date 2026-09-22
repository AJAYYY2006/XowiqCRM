/**
 * Bulk import configuration for the Operations modules.
 *
 * Each module config describes:
 *  - table        : the Supabase table rows are inserted into
 *  - fields       : the importable fields (key = DB column unless type === 'lookup')
 *  - sampleRows   : rows used to build the downloadable template
 *
 * Field shape:
 *  key           DB column name (for lookups: the virtual column name in the file)
 *  label         Header used in templates and the mapping UI
 *  required      Row is rejected when empty
 *  type          text | email | phone | number | integer | date | enum | lookup
 *  aliases       Alternative header spellings that auto-map to this field
 *  options       (enum) allowed values. Must match the DB check constraint
 *  synonyms      (enum) { alternativeSpelling: canonicalValue }
 *  default       Value used when the cell is empty
 *  ownerDefault  When empty, use the logged-in user's name
 *  lookup        (lookup) { table, matchColumn, targetKey, createIfMissing, ownerKey }
 */

const OWNER_ALIASES = ['owner', 'owner name', 'assigned to', 'assignee', 'rep', 'sales rep', 'handled by']
const EMAIL_ALIASES = ['email', 'e-mail', 'email address', 'email id', 'mail']
const PHONE_ALIASES = ['phone', 'phone number', 'phone no', 'mobile', 'mobile number', 'mobile no', 'contact', 'contact number', 'contact no', 'telephone', 'tel', 'cell', 'whatsapp']

export const IMPORT_CONFIGS = {
  leads: {
    table: 'leads',
    label: 'Leads',
    singular: 'lead',
    plural: 'leads',
    fields: [
      { key: 'name', label: 'Lead Name', required: true, type: 'text', aliases: ['name', 'lead', 'lead name', 'full name', 'customer name', 'person', 'prospect', 'prospect name'] },
      { key: 'email', label: 'Email', type: 'email', aliases: EMAIL_ALIASES },
      { key: 'contact_number', label: 'Contact Number', type: 'phone', aliases: PHONE_ALIASES, default: '' },
      { key: 'company', label: 'Company', type: 'text', aliases: ['company', 'company name', 'organization', 'organisation', 'org', 'business', 'firm', 'account'] },
      { key: 'lead_owner', label: 'Lead Owner', type: 'text', aliases: ['lead owner', ...OWNER_ALIASES], ownerDefault: true },
      {
        key: 'status', label: 'Status', type: 'enum', aliases: ['status', 'stage', 'lead status'],
        options: ['new', 'contacted', 'working', 'lost'],
        synonyms: { open: 'new', fresh: 'new', 'in progress': 'working', qualified: 'working', closed: 'lost', dead: 'lost' },
        default: 'new'
      }
    ],
    sampleRows: [
      { 'Lead Name': 'Priya Sharma', 'Contact Number': '+91 98765 43210', Email: 'priya@acme.com', Company: 'Acme Corp', 'Lead Owner': '', Status: 'new' },
      { 'Lead Name': 'Rahul Verma', 'Contact Number': '+91 91234 56789', Email: 'rahul@globex.in', Company: 'Globex', 'Lead Owner': '', Status: 'contacted' }
    ]
  },

  contacts: {
    table: 'contacts',
    label: 'Contacts',
    singular: 'contact',
    plural: 'contacts',
    fields: [
      { key: 'name', label: 'Contact Name', required: true, type: 'text', aliases: ['name', 'contact', 'contact name', 'full name', 'person', 'person name'] },
      { key: 'email', label: 'Email', type: 'email', aliases: EMAIL_ALIASES },
      { key: 'phone', label: 'Phone', type: 'phone', aliases: PHONE_ALIASES },
      { key: 'gender', label: 'Gender', type: 'text', aliases: ['gender', 'sex'] },
      {
        key: 'account_name', label: 'Account Name', type: 'lookup',
        aliases: ['account', 'account name', 'company', 'company name', 'organization', 'organisation', 'customer', 'customer name'],
        lookup: { table: 'accounts', matchColumn: 'account_name', targetKey: 'account_id', createIfMissing: { status: 'prospect' }, ownerKey: 'account_owner' }
      },
      { key: 'contact_owner', label: 'Contact Owner', type: 'text', aliases: ['contact owner', ...OWNER_ALIASES], ownerDefault: true }
    ],
    sampleRows: [
      { 'Contact Name': 'Anita Desai', Email: 'anita@acme.com', Phone: '+91 98765 11111', Gender: 'Female', 'Account Name': 'Acme Corp', 'Contact Owner': '' },
      { 'Contact Name': 'Vikram Rao', Email: 'vikram@globex.in', Phone: '+91 98765 22222', Gender: 'Male', 'Account Name': 'Globex', 'Contact Owner': '' }
    ]
  },

  accounts: {
    table: 'accounts',
    label: 'Accounts',
    singular: 'account',
    plural: 'accounts',
    fields: [
      { key: 'account_name', label: 'Account Name', required: true, type: 'text', aliases: ['name', 'account', 'account name', 'customer', 'customer name', 'company', 'company name', 'organization', 'organisation', 'client', 'client name', 'full name'] },
      { key: 'email', label: 'Email', type: 'email', aliases: EMAIL_ALIASES },
      { key: 'phone', label: 'Phone', type: 'phone', aliases: PHONE_ALIASES },
      { key: 'address', label: 'Address', type: 'text', aliases: ['address', 'location', 'city', 'physical address', 'street'] },
      {
        key: 'status', label: 'Status', type: 'enum', aliases: ['status', 'account status', 'stage'],
        options: ['Active', 'Inactive', 'prospect', 'customer', 'New', 'working', 'contacted', 'lost'],
        synonyms: { active: 'Active', inactive: 'Inactive', new: 'New', prospecting: 'prospect', client: 'customer' },
        default: 'Active'
      },
      { key: 'notes', label: 'Notes', type: 'text', aliases: ['notes', 'note', 'remarks', 'comments', 'description'] },
      { key: 'account_owner', label: 'Account Owner', type: 'text', aliases: ['account owner', ...OWNER_ALIASES], ownerDefault: true }
    ],
    sampleRows: [
      { 'Account Name': 'Acme Corp', Email: 'hello@acme.com', Phone: '+91 80 4000 1000', Address: 'Bengaluru, KA', Status: 'Active', Notes: 'Key account', 'Account Owner': '' },
      { 'Account Name': 'Meera Nair Enterprises', Email: 'contact@meera.com', Phone: '+91 98765 33333', Address: 'Kochi, KL', Status: 'New', Notes: 'Enterprise client', 'Account Owner': '' }
    ]
  },

  opportunities: {
    table: 'opportunities',
    label: 'Opportunities',
    singular: 'opportunity',
    plural: 'opportunities',
    fields: [
      {
        key: 'name',
        label: 'Deal Name',
        required: true,
        type: 'text',
        aliases: ['deal', 'deal name', 'opportunity', 'opportunity name', 'name', 'title', 'deal title', 'subject']
      },
      {
        key: 'amount',
        label: 'Deal Amount',
        type: 'number',
        aliases: ['amount', 'deal amount', 'value', 'deal value', 'revenue', 'price', 'total', 'deal size'],
        default: 0
      },
      {
        key: 'stage',
        label: 'Pipeline Stage',
        type: 'enum',
        aliases: ['stage', 'pipeline stage', 'status', 'deal stage', 'phase'],
        options: ['Prospecting', 'Scoping', 'Negotiation', 'Legal', 'Contract', 'Closed'],
        synonyms: {
          prospecting: 'Prospecting',
          scoping: 'Scoping',
          scope: 'Scoping',
          qualification: 'Scoping',
          qualifying: 'Scoping',
          proposal: 'Scoping',
          negotiation: 'Negotiation',
          negotiating: 'Negotiation',
          legal: 'Legal',
          contract: 'Contract',
          contracting: 'Contract',
          closed: 'Closed',
          'closed won': 'Closed',
          'closed_won': 'Closed',
          'closed lost': 'Closed',
          'closed_lost': 'Closed',
          won: 'Closed',
          lost: 'Closed'
        },
        default: 'Prospecting'
      },
      {
        key: 'closed_date',
        label: 'Expected Close Date',
        type: 'date',
        aliases: ['expected close', 'expected close date', 'close date', 'closed date', 'closing date', 'due date', 'target date', 'expected date']
      },
      {
        key: 'account_name',
        label: 'Account Name',
        type: 'lookup',
        aliases: ['account', 'account name', 'company', 'company name', 'organization', 'organisation', 'customer', 'customer name', 'client', 'client name'],
        lookup: {
          table: 'accounts',
          matchColumn: 'account_name',
          targetKey: 'account_id',
          createIfMissing: { status: 'prospect' },
          ownerKey: 'account_owner'
        }
      },
      {
        key: 'owner',
        label: 'Deal Owner',
        type: 'text',
        aliases: ['deal owner', 'opportunity owner', ...OWNER_ALIASES],
        ownerDefault: true
      },
      {
        key: 'probability',
        label: 'Probability (%)',
        type: 'integer',
        aliases: ['probability', 'prob', 'chance', 'likelihood', 'win rate', 'win probability'],
        default: 50
      }
    ],
    sampleRows: [
      {
        'Deal Name': 'Enterprise Cloud Migration',
        'Account Name': 'Acme Corp',
        'Deal Amount': 250000,
        'Pipeline Stage': 'Negotiation',
        'Expected Close Date': '2026-11-15',
        'Deal Owner': '',
        'Probability (%)': 60
      },
      {
        'Deal Name': 'Annual CRM License',
        'Account Name': 'Globex',
        'Deal Amount': 48000,
        'Pipeline Stage': 'Prospecting',
        'Expected Close Date': '2026-12-01',
        'Deal Owner': '',
        'Probability (%)': 40
      }
    ]
  },

  tasks: {
    table: 'tasks',
    label: 'Tasks',
    singular: 'task',
    plural: 'tasks',
    fields: [
      { key: 'title', label: 'Task Title', required: true, type: 'text', aliases: ['title', 'task', 'task title', 'task name', 'subject', 'name', 'summary'] },
      { key: 'due_date', label: 'Due Date', type: 'date', aliases: ['due date', 'due', 'deadline', 'due on', 'date', 'target date'] },
      {
        key: 'status', label: 'Status', type: 'enum', aliases: ['status', 'state', 'task status'],
        options: ['Pending', 'In Progress', 'Completed', 'Overdue', 'Open', 'Working'],
        synonyms: { todo: 'Pending', 'to do': 'Pending', new: 'Pending', done: 'Completed', complete: 'Completed', closed: 'Completed', finished: 'Completed', inprogress: 'In Progress', 'in-progress': 'In Progress', started: 'In Progress', late: 'Overdue' },
        default: 'Pending'
      },
      {
        key: 'task_type', label: 'Task Type', type: 'enum', aliases: ['type', 'task type', 'category', 'activity type'],
        options: ['Follow-up', 'Demo', 'Onboarding', 'Renewal', 'Support', 'Email', 'Message', 'Call', 'Events'],
        synonyms: { followup: 'Follow-up', 'follow up': 'Follow-up', event: 'Events', meeting: 'Demo', phone: 'Call', sms: 'Message', whatsapp: 'Message' },
        default: 'Follow-up'
      },
      { key: 'owner', label: 'Owner', type: 'text', aliases: ['task owner', ...OWNER_ALIASES], ownerDefault: true },
      {
        key: 'related_to', label: 'Related To', type: 'enum', aliases: ['related to', 'related', 'module', 'entity', 'linked to'],
        options: ['leads', 'contacts', 'accounts', 'opportunities', 'invoices', 'quotes', 'tickets'],
        synonyms: { lead: 'leads', contact: 'contacts', account: 'accounts', customer: 'accounts', customers: 'accounts', opportunity: 'opportunities', invoice: 'invoices', quote: 'quotes', ticket: 'tickets' },
        default: 'accounts'
      }
    ],
    sampleRows: [
      { 'Task Title': 'Follow up on proposal', 'Due Date': '2026-10-01', Status: 'Pending', 'Task Type': 'Follow-up', Owner: '', 'Related To': 'accounts' },
      { 'Task Title': 'Product demo with Globex', 'Due Date': '2026-10-05', Status: 'In Progress', 'Task Type': 'Demo', Owner: '', 'Related To': 'leads' }
    ]
  },

  services: {
    table: 'services',
    label: 'Services',
    singular: 'service',
    plural: 'services',
    fields: [
      { key: 'service_name', label: 'Service Name', required: true, type: 'text', aliases: ['name', 'service', 'service name', 'title', 'product', 'product name', 'item'] },
      { key: 'price', label: 'Price', type: 'number', aliases: ['price', 'cost', 'rate', 'amount', 'fee', 'charge', 'unit price'], default: 0 },
      { key: 'reminder_days', label: 'Reminder Days', type: 'integer', aliases: ['reminder days', 'reminder', 'days', 'renewal days', 'reminder after', 'renew in'], default: 30 },
      { key: 'description', label: 'Description', type: 'text', aliases: ['description', 'details', 'notes', 'summary', 'about'] },
      {
        key: 'status', label: 'Status', type: 'enum', aliases: ['status', 'state'],
        options: ['active', 'inactive'],
        synonyms: { enabled: 'active', disabled: 'inactive', archived: 'inactive', yes: 'active', no: 'inactive' },
        default: 'active'
      },
      {
        key: 'service_type', label: 'Service Type', type: 'enum', aliases: ['type', 'service type', 'kind', 'tracking'],
        options: ['Instant', 'Multi-Stage'],
        synonyms: { 'multi stage': 'Multi-Stage', multistage: 'Multi-Stage', staged: 'Multi-Stage', tracked: 'Multi-Stage' },
        default: 'Instant'
      }
    ],
    sampleRows: [
      { 'Service Name': 'Annual Maintenance', Price: 12000, 'Reminder Days': 365, Description: 'Yearly AMC package', Status: 'active', 'Service Type': 'Instant' },
      { 'Service Name': 'Website Redesign', Price: 45000, 'Reminder Days': 30, Description: 'Multi-phase redesign project', Status: 'active', 'Service Type': 'Multi-Stage' }
    ]
  },

  tickets: {
    table: 'tickets',
    label: 'Tickets',
    singular: 'ticket',
    plural: 'tickets',
    fields: [
      { key: 'subject', label: 'Subject', required: true, type: 'text', aliases: ['subject', 'ticket', 'ticket subject', 'title', 'issue', 'summary', 'name', 'problem'] },
      { key: 'description', label: 'Description', type: 'text', aliases: ['description', 'details', 'notes', 'body', 'message', 'issue description'] },
      {
        key: 'priority', label: 'Priority', type: 'enum', aliases: ['priority', 'urgency', 'severity', 'importance'],
        options: ['low', 'medium', 'high'],
        synonyms: { normal: 'medium', urgent: 'high', critical: 'high', minor: 'low', major: 'high', p1: 'high', p2: 'medium', p3: 'low' },
        default: 'medium'
      },
      {
        key: 'status', label: 'Status', type: 'enum', aliases: ['status', 'state', 'ticket status'],
        options: ['open', 'pending', 'closed'],
        synonyms: { new: 'open', 'in progress': 'pending', waiting: 'pending', 'on hold': 'pending', resolved: 'closed', done: 'closed', complete: 'closed', completed: 'closed' },
        default: 'open'
      },
      { key: 'owner', label: 'Owner', type: 'text', aliases: ['ticket owner', 'agent', 'support agent', ...OWNER_ALIASES], ownerDefault: true },
      {
        key: 'contact_name', label: 'Contact Name', type: 'lookup',
        aliases: ['contact', 'contact name', 'requester', 'reported by', 'customer contact', 'person'],
        lookup: { table: 'contacts', matchColumn: 'name', targetKey: 'contact_id' }
      },
      {
        key: 'account_name', label: 'Account Name', type: 'lookup',
        aliases: ['account', 'account name', 'company', 'company name', 'customer', 'customer name', 'organization', 'organisation'],
        lookup: { table: 'accounts', matchColumn: 'account_name', targetKey: 'account_id' }
      }
    ],
    sampleRows: [
      { Subject: 'Login page not loading', Description: 'Customer reports a blank screen after sign-in.', Priority: 'high', Status: 'open', Owner: '', 'Contact Name': 'Anita Desai', 'Account Name': 'Acme Corp' },
      { Subject: 'Invoice copy request', Description: 'Needs a PDF copy of last month invoice.', Priority: 'low', Status: 'pending', Owner: '', 'Contact Name': '', 'Account Name': 'Globex' }
    ]
  }
}

export const BATCH_SIZE = 50
export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

/** Normalise a header/alias for fuzzy matching: lowercase, alphanumerics only. */
export function normalizeHeader(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Build a map of fileHeader -> fieldKey ('' when nothing matched).
 * Exact key/label/alias matches win; each field can only be claimed once.
 */
export function autoMapColumns(headers, fields) {
  const claimed = new Set()
  const mapping = {}
  const candidates = fields.map(f => ({
    key: f.key,
    tokens: new Set([f.key, f.label, ...(f.aliases || [])].map(normalizeHeader))
  }))

  headers.forEach(header => {
    const norm = normalizeHeader(header)
    if (!norm) { mapping[header] = ''; return }
    const hit = candidates.find(c => !claimed.has(c.key) && c.tokens.has(norm))
    if (hit) {
      claimed.add(hit.key)
      mapping[header] = hit.key
    } else {
      mapping[header] = ''
    }
  })
  return mapping
}
