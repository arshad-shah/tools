// components/ContactForm.tsx
import React from 'react';
import { ContactData } from '../../../types/qrTypes';

interface ContactFormProps {
  contactData: ContactData;
  setContactData: (data: Partial<ContactData>) => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ contactData, setContactData }) => {
  const { name, phone, email, company } = contactData;

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setContactData({ name: e.target.value })}
          className="peer h-10 w-full border-b-2 border-purple-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-violet-600"
          placeholder="Name"
        />
        <label 
          htmlFor="name" 
          className="absolute left-0 -top-3.5 text-sm text-purple-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-purple-600 peer-focus:text-sm"
        >
          Full Name
        </label>
      </div>

      <div className="relative">
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setContactData({ phone: e.target.value })}
          className="peer h-10 w-full border-b-2 border-purple-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-violet-600"
          placeholder="Phone"
        />
        <label 
          htmlFor="phone" 
          className="absolute left-0 -top-3.5 text-sm text-purple-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-purple-600 peer-focus:text-sm"
        >
          Phone Number
        </label>
      </div>

      <div className="relative">
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setContactData({ email: e.target.value })}
          className="peer h-10 w-full border-b-2 border-purple-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-violet-600"
          placeholder="Email"
        />
        <label 
          htmlFor="email" 
          className="absolute left-0 -top-3.5 text-sm text-purple-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-purple-600 peer-focus:text-sm"
        >
          Email Address
        </label>
      </div>

      <div className="relative">
        <input
          type="text"
          id="company"
          value={company}
          onChange={(e) => setContactData({ company: e.target.value })}
          className="peer h-10 w-full border-b-2 border-purple-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-violet-600"
          placeholder="Company"
        />
        <label 
          htmlFor="company" 
          className="absolute left-0 -top-3.5 text-sm text-purple-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-purple-600 peer-focus:text-sm"
        >
          Company Name
        </label>
      </div>
    </div>
  );
};

export default ContactForm;