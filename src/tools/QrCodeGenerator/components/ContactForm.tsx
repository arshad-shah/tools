// components/ContactForm.tsx
import React from 'react';
import { ContactData } from '../../../types/qrTypes';
import { User, Phone, Mail, Building2, QrCode } from 'lucide-react';

interface ContactFormProps {
  contactData: ContactData;
  setContactData: (data: Partial<ContactData>) => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ contactData, setContactData }) => {
  const { name, phone, email, company } = contactData;

  return (
    <div className="space-y-5">
      {/* Full Name Input */}
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <User size={16} className="text-emerald-500" />
          Full Name
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setContactData({ name: e.target.value })}
            className="block w-full px-3 py-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="Enter full name"
          />
        </div>
      </div>

      {/* Phone Number Input */}
      <div className="space-y-1">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Phone size={16} className="text-emerald-500" />
          Phone Number
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setContactData({ phone: e.target.value })}
            className="block w-full px-3 py-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="+1 (123) 456-7890"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Include country code for international numbers
        </p>
      </div>

      {/* Email Address Input */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Mail size={16} className="text-emerald-500" />
          Email Address
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setContactData({ email: e.target.value })}
            className="block w-full px-3 py-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="name@example.com"
          />
        </div>
      </div>

      {/* Company Name Input */}
      <div className="space-y-1">
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Building2 size={16} className="text-emerald-500" />
          Company Name
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            id="company"
            value={company}
            onChange={(e) => setContactData({ company: e.target.value })}
            className="block w-full px-3 py-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="Company or organization (optional)"
          />
        </div>
      </div>

      {/* Contact Preview */}
      {(name || phone || email) && (
        <div className="mt-6 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="flex items-center gap-1.5 mb-2">
            <QrCode size={16} className="text-emerald-600" />
            <h4 className="text-sm font-medium text-emerald-800">Contact Preview</h4>
          </div>
          <div className="text-sm text-emerald-700 space-y-1">
            {name && (
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-emerald-600 flex-shrink-0" />
                <span>{name}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-600 flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-emerald-600 flex-shrink-0" />
                <span>{email}</span>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className="text-emerald-600 flex-shrink-0" />
                <span>{company}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactForm;