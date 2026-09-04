const fs = require('fs');
const files = [
  'Tickets.jsx', 'Tasks.jsx', 'Services.jsx', 'Reports.jsx', 'Quotes.jsx',
  'Opportunities.jsx', 'Leads.jsx', 'Invoices.jsx', 'Contacts.jsx', 'Accounts.jsx'
];
files.forEach(f => {
  const p = 'c:/Desktop/kaviya shree ( Xowiq )/999+ zip file/999+/CRM3/CRM NEW/src/components/modules/' + f;
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(
    /const isAdmin = \['admin', 'administrator'\]\.includes\(\(profile\?\.role \|\| session\?\.user\?\.user_metadata\?\.role \|\| ''\)\.toLowerCase\(\)\)/g,
    "const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())"
  );
  fs.writeFileSync(p, code);
  console.log('Fixed ' + f);
});
