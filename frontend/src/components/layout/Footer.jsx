import React, { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export default function Footer() {
  const { settings } = useSettings();
  const [popupOpen, setPopupOpen] = useState(false);
  const companyName = (settings && settings.company_name) ? settings.company_name : "Your Company";
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="app-footer">
        <span className="app-footer__rights">
          &copy; {year} All Rights Reserved &mdash; <strong>{companyName}</strong>
        </span>
        <span className="app-footer__sep">|</span>
        <span className="app-footer__powered">
          Powered by{" "}
          <button
            className="app-footer__sands-btn"
            onClick={() => setPopupOpen(true)}
            aria-label="About SaNDS Lab"
          >
            SaNDS Lab
          </button>
        </span>
      </footer>

      {popupOpen && (
        <div className="sands-overlay" onClick={() => setPopupOpen(false)}>
          <div
            className="sands-popup"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button className="sands-popup__close" onClick={() => setPopupOpen(false)}>&#x2715;</button>

            <div className="sands-popup__logo-wrap">
              <img
                src="https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png"
                alt="SaNDS Lab Logo"
                className="sands-popup__logo"
              />
            </div>

            <p className="sands-popup__tagline">Innovative Solutions &amp; Digital Services</p>

            <div className="sands-popup__actions">
              <a
                href="https://wa.me/97335078079"
                target="_blank"
                rel="noopener noreferrer"
                className="sands-popup__action-btn sands-popup__action-btn--whatsapp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="sands-popup__btn-icon">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Connect on WhatsApp
              </a>

              <a
                href="https://www.sandslab.com"
                target="_blank"
                rel="noopener noreferrer"
                className="sands-popup__action-btn sands-popup__action-btn--website"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sands-popup__btn-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Visit Our Website
              </a>

              <a
                href="https://sandslab.com/products/"
                target="_blank"
                rel="noopener noreferrer"
                className="sands-popup__action-btn sands-popup__action-btn--products"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sands-popup__btn-icon">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Our Latest Products
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
