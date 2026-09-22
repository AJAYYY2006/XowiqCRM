import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export default function LocalSearch({ data = [], searchKeys = [], onSelect = () => {}, placeholder = "Search...", renderItem = (item) => item.name || item.account_name || item.service_name || "Result" }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const results = query.trim() === '' ? [] : (data || []).filter(item => {
    if (!searchKeys || searchKeys.length === 0) return true; // Show all if no keys
    return searchKeys.some(key => {
      const val = item[key];
      return val && val.toString().toLowerCase().includes(query.toLowerCase());
    });
  }).slice(0, 5); 

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    onSelect(item);
  };

  return (
    <div ref={wrapperRef} className="global-search-container" style={{ width: '260px' }}>
      <div className="search-input-wrap global-search-input-wrap" style={{ height: '36px', padding: '0 12px' }}>
        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: 8 }} />
        <input 
          type="text" 
          className="search-input" 
          placeholder={placeholder} 
          value={query}
          onChange={(e) => {
             setQuery(e.target.value);
             setIsOpen(true);
          }}
          onFocus={() => { if (query.trim() !== '') setIsOpen(true) }}
          style={{ fontSize: '13px', padding: 0 }}
        />
      </div>

      {isOpen && query.trim() !== '' && (
        <div className="search-dropdown dropdown-animation" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '300px' }}>
          {results.length > 0 ? (
            <div className="search-results-list">
              {results.map(item => (
                <div key={item.id} className="search-result-item clickable-row" onClick={() => handleSelect(item)} style={{ padding: '8px 12px' }}>
                  <div className="search-result-content" style={{ width: '100%' }}>
                     {renderItem(item)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="search-no-results" style={{ padding: '12px', fontSize: '13px' }}>
               No results found.
             </div>
          )}
        </div>
      )}
    </div>
  );
}
