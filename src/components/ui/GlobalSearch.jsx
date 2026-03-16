import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function GlobalSearch({ session }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 1) {
        performSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchTerm) => {
    setLoading(true);
    setIsOpen(true);
    
    try {
      const term = `%${searchTerm}%`;
      const uid = session.user.id;
      
      const queries = [
        supabase.from('leads').select('id, name, company').eq('user_id', uid).neq('status', 'converted').ilike('name', term).limit(3),
        supabase.from('contacts').select('id, name, email, phone').eq('user_id', uid).ilike('name', term).limit(3),
        supabase.from('contacts').select('id, name, email, phone').eq('user_id', uid).ilike('phone', term).limit(3),
        supabase.from('contacts').select('id, name, email, phone').eq('user_id', uid).ilike('email', term).limit(3),
        supabase.from('accounts').select('id, account_name, domain').eq('user_id', uid).ilike('account_name', term).limit(3),
        supabase.from('opportunities').select('id, name, stage').eq('user_id', uid).ilike('name', term).limit(3),
        supabase.from('quotes').select('id, quote_name').eq('user_id', uid).ilike('quote_name', term).limit(3),
        supabase.from('tickets').select('id, subject, ticket_no').eq('user_id', uid).ilike('subject', term).limit(3),
        supabase.from('tickets').select('id, subject, ticket_no').eq('user_id', uid).ilike('ticket_no', term).limit(3),
        supabase.from('invoices').select('id, invoice_name, status, opportunity_id').eq('user_id', uid).ilike('invoice_name', term).limit(3),
      ];

      const [leadsRes, contactsByNameRes, contactsByPhoneRes, contactsByEmailRes, accountsRes, oppsRes, quotesRes, ticketsBySubjectRes, ticketsByNoRes, invoicesRes] = await Promise.all(queries);

      let aggregated = [];
      const seen = new Set();

      const addUnique = (item) => {
        const key = `${item.type}-${item.id}`;
        if (!seen.has(key)) { seen.add(key); aggregated.push(item); }
      };

      if (leadsRes.data) {
        leadsRes.data.forEach(item => addUnique({ ...item, type: 'Lead', title: item.name, subtitle: item.company || 'No Company', path: '/dashboard/leads' }));
      }
      // Merge contacts by name, phone, and email — deduplicated
      const allContacts = [...(contactsByNameRes.data || []), ...(contactsByPhoneRes.data || []), ...(contactsByEmailRes.data || [])];
      allContacts.forEach(item => {
        const subtitle = item.phone ? `📞 ${item.phone}` : item.email ? `✉️ ${item.email}` : 'No Contact Info';
        addUnique({ ...item, type: 'Contact', title: item.name, subtitle, path: '/dashboard/contacts' });
      });

      if (accountsRes.data) {
        accountsRes.data.forEach(item => addUnique({ ...item, type: 'Account', title: item.account_name, subtitle: item.domain || 'No Domain', path: '/dashboard/accounts' }));
      }
      if (oppsRes.data) {
        oppsRes.data.forEach(item => addUnique({ ...item, type: 'Opportunity', title: item.name, subtitle: item.stage, path: '/dashboard/opportunities' }));
      }
      if (quotesRes.data) {
        quotesRes.data.forEach(item => addUnique({ ...item, type: 'Quote', title: item.quote_name, subtitle: 'Quote', path: '/dashboard/quotes' }));
      }
      // Merge tickets by subject and ticket_no, deduplicated
      const allTickets = [...(ticketsBySubjectRes.data || []), ...(ticketsByNoRes.data || [])];
      allTickets.forEach(item => addUnique({ ...item, type: 'Ticket', title: item.subject, subtitle: item.ticket_no || 'Ticket', path: '/dashboard/tickets' }));

      if (invoicesRes.data) {
        invoicesRes.data.forEach(item => addUnique({ ...item, type: 'Invoice', title: item.invoice_name, subtitle: item.status || 'Invoice', path: '/dashboard/opportunities' }));
      }

      setResults(aggregated);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    navigate(item.path, { state: { openId: item.id } });
  };

  return (
    <div ref={wrapperRef} className="global-search-container">
      <div className="search-input-wrap global-search-input-wrap">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search leads, contacts, accounts, opportunities, quotes, invoices, tickets..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
        />
        {loading && <div className="search-spinner-container"><div className="spinner" style={{width: 16, height: 16, borderTopColor: 'var(--accent)', opacity: 0.5}}></div></div>}
      </div>

      {isOpen && (
        <div className="search-dropdown dropdown-animation">
          {results.length > 0 ? (
            <div className="search-results-list">
              {results.map(item => (
                <div key={`${item.type}-${item.id}`} className="search-result-item clickable-row" onClick={() => handleSelect(item)}>
                  <div className="search-result-content">
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span className="fw-bold" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                        <span className={`badge badge-${item.type === 'Opportunity' ? 'working' : 'active'}`} style={{fontSize: 10, padding: '2px 6px'}}>{item.type}</span>
                     </div>
                     <div className="text-muted" style={{ fontSize: 12 }}>{item.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="search-no-results">
              {query.length > 1 && !loading ? 'No results found.' : 'Keep typing...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
