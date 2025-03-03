/* eslint-disable no-case-declarations */
import React, { useState } from 'react';
import { PlusCircle, Trash2, Download, RefreshCw, Code } from 'lucide-react';
import _ from 'lodash';

// TypeScript interfaces
interface FieldSchema {
  name: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

interface GeneratedDataItem {
  [key: string]: string | number | boolean | null;
}

interface FieldType {
  value: string;
  label: string;
}

const RandomDataGenerator: React.FC = () => {
  const [schema, setSchema] = useState<FieldSchema[]>([
    { name: 'id', type: 'uuid', required: true },
    { name: 'name', type: 'fullName', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'age', type: 'number', min: 18, max: 65, required: true },
  ]);
  
  const [count, setCount] = useState<number>(5);
  const [generatedData, setGeneratedData] = useState<GeneratedDataItem[] | null>(null);
  const [showJson, setShowJson] = useState<boolean>(false);
  
  const fieldTypes: FieldType[] = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'uuid', label: 'UUID' },
    { value: 'fullName', label: 'Full Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'dateTime', label: 'Date & Time' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'country', label: 'Country' },
    { value: 'zipCode', label: 'Zip Code' },
    { value: 'gender', label: 'Gender' },
    { value: 'sex', label: 'Sex' },
    { value: 'username', label: 'Username' },
    { value: 'password', label: 'Password' },
    { value: 'avatar', label: 'Avatar URL' },
    { value: 'color', label: 'Color' },
    { value: 'url', label: 'URL' },
    { value: 'ipAddress', label: 'IP Address' },
    { value: 'creditCard', label: 'Credit Card' },
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'jobTitle', label: 'Job Title' },
    { value: 'company', label: 'Company' },
    { value: 'currency', label: 'Currency Amount' },
  ];

  const addField = (): void => {
    setSchema([...schema, { name: `field${schema.length + 1}`, type: 'string', required: false }]);
  };

  const removeField = (index: number): void => {
    setSchema(schema.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: FieldSchema): void => {
    const newSchema = [...schema];
    newSchema[index] = field;
    setSchema(newSchema);
  };

  const generateRandomValue = (field: FieldSchema): string | number | boolean | null => {
    const { type, min, max } = field;
    
    switch (type) {
      case 'string':
        return _.times(_.random(5, 10), () => String.fromCharCode(_.random(97, 122))).join('');
      case 'number':
        return _.random(min || 0, max || 100);
      case 'boolean':
        return Math.random() > 0.5;
      case 'uuid':
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      case 'fullName':
        const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Emma', 'Maria', 'Chen', 'Aisha', 'Carlos'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Patel', 'Kim'];
        return `${firstNames[_.random(0, firstNames.length - 1)]} ${lastNames[_.random(0, lastNames.length - 1)]}`;
      case 'firstName':
        const fNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Emma', 'Robert', 'Jennifer', 'Mohammed', 'Sophia', 'Wei', 'Fatima'];
        return fNames[_.random(0, fNames.length - 1)];
      case 'lastName':
        const lNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Lee', 'Nguyen', 'Patel', 'Kim'];
        return lNames[_.random(0, lNames.length - 1)];
      case 'email':
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'company.co'];
        const nameChars = _.times(_.random(5, 8), () => String.fromCharCode(_.random(97, 122))).join('');
        return `${nameChars}@${domains[_.random(0, domains.length - 1)]}`;
      case 'phone':
        return `(${_.random(100, 999)}) ${_.random(100, 999)}-${_.random(1000, 9999)}`;
      case 'date':
        const start = new Date(2000, 0, 1);
        const end = new Date();
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
      case 'dateTime':
        const startDt = new Date(2000, 0, 1);
        const endDt = new Date();
        return new Date(startDt.getTime() + Math.random() * (endDt.getTime() - startDt.getTime())).toISOString();
      case 'address':
        const streets = ['Main St', 'Park Ave', 'Oak Ln', 'Maple Rd', 'Washington Blvd', 'Cedar St', 'Highland Ave', 'River Rd'];
        return `${_.random(100, 9999)} ${streets[_.random(0, streets.length - 1)]}`;
      case 'city':
        const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Toronto', 'London', 'Berlin', 'Mumbai'];
        return cities[_.random(0, cities.length - 1)];
      case 'country':
        const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'China', 'Mexico', 'South Africa'];
        return countries[_.random(0, countries.length - 1)];
      case 'zipCode':
        return _.random(10000, 99999).toString();
      case 'gender':
        const genders = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Prefer not to say'];
        return genders[_.random(0, genders.length - 1)];
      case 'sex':
        const sexes = ['Male', 'Female', 'Intersex'];
        return sexes[_.random(0, sexes.length - 1)];
      case 'username':
        const prefix = _.times(_.random(3, 6), () => String.fromCharCode(_.random(97, 122))).join('');
        const suffix = _.random(0, 9999);
        return `${prefix}${suffix}`;
      case 'password':
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        return _.times(_.random(8, 16), () => chars[_.random(0, chars.length - 1)]).join('');
      case 'avatar':
        return `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${_.random(1, 99)}.jpg`;
      case 'color':
        return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
      case 'url':
        const domains2 = ['example.com', 'test.org', 'demo.net', 'sample.io', 'mockup.co'];
        return `https://www.${domains2[_.random(0, domains2.length - 1)]}/${_.times(_.random(3, 8), () => String.fromCharCode(_.random(97, 122))).join('')}`;
      case 'ipAddress':
        return `${_.random(1, 255)}.${_.random(0, 255)}.${_.random(0, 255)}.${_.random(0, 255)}`;
      case 'creditCard':
        const ccPrefix = ['4', '5', '37', '34', '6011'][_.random(0, 4)];
        const ccDigits = _.times(16 - ccPrefix.length, () => _.random(0, 9)).join('');
        return `${ccPrefix}${ccDigits}`;
      case 'paragraph':
        const sentences = [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
          'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
          'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.'
        ];
        return _.sampleSize(sentences, _.random(1, 3)).join(' ');
      case 'jobTitle':
        const jobTitles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Marketing Specialist', 
                          'Customer Support Representative', 'HR Manager', 'Sales Executive', 'UX Designer', 
                          'Financial Analyst', 'Operations Director'];
        return jobTitles[_.random(0, jobTitles.length - 1)];
      case 'company':
        const companies = ['Acme Inc.', 'TechCorp', 'GlobalSystems', 'Innovatech', 'Summit Industries', 
                          'Horizon Solutions', 'Apex Enterprises', 'Pinnacle Group', 'Quantum Dynamics', 'Nexus Corporation'];
        return companies[_.random(0, companies.length - 1)];
      case 'currency':
        return `${(Math.random() * 10000).toFixed(2)}`;
      default:
        return 'Unknown type';
    }
  };

  const generateData = (): void => {
    const data: GeneratedDataItem[] = _.times(count, () => {
      const item: GeneratedDataItem = {};
      schema.forEach(field => {
        if (field.required || Math.random() > 0.2) { // 80% chance to include non-required fields
          item[field.name] = generateRandomValue(field);
        }
      });
      return item;
    });
    
    setGeneratedData(data);
  };

  const downloadJSON = (): void => {
    if (!generatedData) return;
    
    const dataStr = JSON.stringify(generatedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.download = 'generated-data.json';
    link.href = url;
    link.click();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 py-6 px-8">
        <h1 className="text-3xl font-bold text-white">Random Data Generator</h1>
        <p className="text-rose-100 mt-2">Generate random JSON data based on your schema definition</p>
      </div>
      
      <div className="flex flex-col md:flex-row flex-1 p-6 gap-6">
        {/* Schema Editor Panel */}
        <div className="w-full md:w-1/2 bg-white rounded-xl shadow-md p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Schema Definition</h2>
          
          <div className="space-y-6">
            {schema.map((field, index) => (
              <div key={index} className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, { ...field, name: e.target.value })}
                      className="border-0 bg-transparent font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-2 py-1 text-lg"
                      placeholder="Field name"
                    />
                  </div>
                  <button
                    onClick={() => removeField(index)}
                    className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove field"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Data Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { ...field, type: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
                    >
                      {fieldTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {field.type === 'number' && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-600 mb-2">Min Value</label>
                        <input
                          type="number"
                          value={field.min || 0}
                          onChange={(e) => updateField(index, { ...field, min: parseInt(e.target.value) })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-600 mb-2">Max Value</label>
                        <input
                          type="number"
                          value={field.max || 100}
                          onChange={(e) => updateField(index, { ...field, max: parseInt(e.target.value) })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <div className="bg-gray-50 p-3 rounded-lg flex items-center">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={field.required || false}
                        onChange={(e) => updateField(index, { ...field, required: e.target.checked })}
                        className="rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                      />
                      <label htmlFor={`required-${index}`} className="ml-2 text-sm text-gray-700 font-medium">
                        Required Field
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-2 text-xs text-gray-500 italic">
                  {field.type === 'string' && "Random string of characters"}
                  {field.type === 'number' && "Random number within specified range"}
                  {field.type === 'boolean' && "Random true/false value"}
                  {field.type === 'uuid' && "Random UUID (universally unique identifier)"}
                  {field.type === 'fullName' && "Random full name (first and last)"}
                  {field.type === 'firstName' && "Random first name"}
                  {field.type === 'lastName' && "Random last name"}
                  {field.type === 'email' && "Random email address"}
                  {field.type === 'phone' && "Random phone number"}
                  {field.type === 'date' && "Random date in YYYY-MM-DD format"}
                  {field.type === 'dateTime' && "Random date and time in ISO format"}
                  {field.type === 'gender' && "Random gender category"}
                  {field.type === 'sex' && "Random biological sex category"}
                  {field.type === 'address' && "Random street address"}
                  {field.type === 'city' && "Random city name"}
                  {field.type === 'currency' && "Random currency amount"}
                  {field.type === 'creditCard' && "Random credit card number format"}
                </div>
              </div>
            ))}
            
            <button
              onClick={addField}
              className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-rose-600 hover:border-rose-400 transition-all hover:shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <PlusCircle size={20} />
              <span className="font-medium">Add New Field</span>
            </button>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <label htmlFor="count" className="text-sm font-medium text-gray-700">Number of items to generate:</label>
              <input
                type="number"
                id="count"
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 w-24"
                min="1"
              />
            </div>
            
            <button
              onClick={generateData}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium rounded-lg shadow hover:from-rose-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              <span>Generate Random Data</span>
            </button>
          </div>
        </div>
        
        {/* Generated Data Panel */}
        <div className="w-full md:w-1/2 bg-white rounded-xl shadow-md p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Generated Data</h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJson(!showJson)}
                className={`p-2 rounded-md ${showJson ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600'} hover:bg-rose-100 hover:text-rose-600 transition-colors`}
                title={showJson ? "Show Table View" : "Show JSON View"}
              >
                <Code size={18} />
              </button>
              
              <button
                onClick={downloadJSON}
                disabled={!generatedData}
                className={`p-2 rounded-md ${!generatedData ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'} transition-colors`}
                title="Download JSON"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {!generatedData ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>No data generated yet. Define your schema and click "Generate".</p>
              </div>
            ) : showJson ? (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm h-full font-mono text-gray-800">
                {JSON.stringify(generatedData, null, 2)}
              </pre>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {schema.map((field) => (
                        <th 
                          key={field.name} 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedData.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {schema.map((field) => (
                          <td key={field.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 overflow-hidden max-w-xs truncate">
                            {item[field.name] !== undefined ? (
                              typeof item[field.name] === 'boolean' 
                                ? item[field.name] ? 'true' : 'false'
                                : String(item[field.name])
                            ) : (
                              <span className="text-gray-300 italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomDataGenerator;