import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

/**
 * SearchableSelect — Select2-style searchable dropdown for React.
 * Props:
 *   options      : [{ value, label, meta }]  — list of options
 *   value        : current selected value (or null)
 *   onChange     : (value) => void
 *   placeholder  : string shown when nothing selected
 *   searchPlaceholder : string inside search box
 *   noOptionsText : string when filter has no results
 */
export default function SearchableSelect({
  options = [],
  value = null,
  onChange,
  placeholder = "— Select —",
  searchPlaceholder = "Type to search...",
  noOptionsText = "No vehicles found",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value)) || null;

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.meta && o.meta.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (opt) => {
    onChange(opt ? opt.value : null);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="ss-container" style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
      {/* Trigger */}
      <div
        className="ss-trigger"
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-surface)",
          cursor: "pointer",
          fontSize: "0.72rem",
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          userSelect: "none",
          minHeight: "30px",
          transition: "border-color 0.15s ease",
        }}
      >
        <Search size={12} style={{ flexShrink: 0, color: "var(--accent)" }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && (
          <X
            size={12}
            style={{ flexShrink: 0, color: "var(--text-muted)", cursor: "pointer" }}
            onClick={handleClear}
          />
        )}
        <ChevronDown
          size={12}
          style={{
            flexShrink: 0,
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          className="ss-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            minWidth: "260px",
          }}
        >
          {/* Search box */}
          <div
            style={{
              padding: "6px 8px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-input)",
            }}
          >
            <Search size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "0.72rem",
                padding: 0,
              }}
            />
            {query && (
              <X
                size={12}
                style={{ cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setQuery("")}
              />
            )}
          </div>

          {/* Clear option */}
          <div
            onClick={() => handleSelect(null)}
            style={{
              padding: "6px 10px",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              cursor: "pointer",
              borderBottom: "1px solid var(--border-color)",
              fontStyle: "italic",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            — Clear selection —
          </div>

          {/* Options list */}
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "10px",
                  textAlign: "center",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                {noOptionsText}
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: "7px 10px",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      color: isSelected ? "var(--accent)" : "var(--text-primary)",
                      background: isSelected ? "var(--status-blue-bg)" : "",
                      fontWeight: isSelected ? 700 : 400,
                      borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "";
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem" }}>
                      {opt.label}
                    </div>
                    {opt.meta && (
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "1px" }}>
                        {opt.meta}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
