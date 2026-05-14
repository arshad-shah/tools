/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from 'lodash';

// TypeScript interfaces
export interface FieldSchema {
  name: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  arraySize?: number;
  fields?: FieldSchema[];
}

export interface GeneratedDataItem {
  [key: string]: string | number | boolean | object | null | undefined;
}

export interface FieldType {
  value: string;
  label: string;
}

// Available field types for the generator
export const fieldTypes: FieldType[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
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

// Field descriptions for UI tooltips and help text
export const fieldDescriptions: Record<string, string> = {
  'object': 'Nested object containing multiple fields',
  'array': 'Array of items',
  'string': 'Random string of characters',
  'number': 'Random number within specified range',
  'boolean': 'Random true/false value',
  'uuid': 'Random UUID (universally unique identifier)',
  'fullName': 'Random full name (first and last)',
  'firstName': 'Random first name',
  'lastName': 'Random last name',
  'email': 'Random email address',
  'phone': 'Random phone number',
  'date': 'Random date in YYYY-MM-DD format',
  'dateTime': 'Random date and time in ISO format',
  'gender': 'Random gender category',
  'sex': 'Random biological sex category',
  'address': 'Random street address',
  'city': 'Random city name',
  'country': 'Random country name',
  'zipCode': 'Random zip/postal code',
  'username': 'Random username',
  'password': 'Random secure password',
  'avatar': 'Random avatar URL',
  'color': 'Random hex color code',
  'url': 'Random website URL',
  'ipAddress': 'Random IP address',
  'creditCard': 'Random credit card number format',
  'paragraph': 'Random paragraph of text',
  'jobTitle': 'Random job title',
  'company': 'Random company name',
  'currency': 'Random currency amount',
};

// Default schema to initialize the generator
export const defaultSchema: FieldSchema[] = [
  { name: 'id', type: 'uuid', required: true },
  { name: 'name', type: 'fullName', required: true },
  { name: 'email', type: 'email', required: true },
  { 
    name: 'address', 
    type: 'object', 
    required: true,
    fields: [
      { name: 'street', type: 'address', required: true },
      { name: 'city', type: 'city', required: true },
      { name: 'zipCode', type: 'zipCode', required: true },
      { name: 'country', type: 'country', required: true }
    ]
  }
];

// Helper function to generate a path string for nested fields
export const getFieldPath = (parentPath: string, fieldName: string): string => {
  return parentPath ? `${parentPath}.${fieldName}` : fieldName;
};

// Generate a random value based on field type
export const generateRandomValue = (field: FieldSchema): any => {
  const { type, min, max, fields, arraySize } = field;
  
  switch (type) {
    case 'object': {
      if (!fields || fields.length === 0) return {};
      
      const obj: Record<string, string | number | boolean | object | null | undefined> = {};
      fields.forEach(nestedField => {
        if (nestedField.required || Math.random() > 0.2) { // 80% chance to include non-required fields
          obj[nestedField.name] = generateRandomValue(nestedField);
        }
      });
      return obj;
    }
      
    case 'array': {
      if (!fields || fields.length === 0) return [];
      
      const size = arraySize || _.random(1, 5);
      return _.times(size, () => {
        // Choose a random field schema from the array's fields
        const randomFieldIndex = _.random(0, fields.length - 1);
        return generateRandomValue(fields[randomFieldIndex]);
      });
    }
      
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
    case 'fullName':{
      const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Emma', 'Maria', 'Chen', 'Aisha', 'Carlos'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Patel', 'Kim'];
      return `${firstNames[_.random(0, firstNames.length - 1)]} ${lastNames[_.random(0, lastNames.length - 1)]}`;}
    case 'firstName':{
      const fNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Emma', 'Robert', 'Jennifer', 'Mohammed', 'Sophia', 'Wei', 'Fatima'];
      return fNames[_.random(0, fNames.length - 1)];}
    case 'lastName':{
      const lNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Lee', 'Nguyen', 'Patel', 'Kim'];
      return lNames[_.random(0, lNames.length - 1)];}
    case 'email': {
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'company.co'];
      const nameChars = _.times(_.random(5, 8), () => String.fromCharCode(_.random(97, 122))).join('');
      return `${nameChars}@${domains[_.random(0, domains.length - 1)]}`;
    }
    case 'phone':
      return `(${_.random(100, 999)}) ${_.random(100, 999)}-${_.random(1000, 9999)}`;
    case 'date':{
      const start = new Date(2000, 0, 1);
      const end = new Date();
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];}
    case 'dateTime':{
      const startDt = new Date(2000, 0, 1);
      const endDt = new Date();
      return new Date(startDt.getTime() + Math.random() * (endDt.getTime() - startDt.getTime())).toISOString();}
    case 'address':{
      const streets = ['Main St', 'Park Ave', 'Oak Ln', 'Maple Rd', 'Washington Blvd', 'Cedar St', 'Highland Ave', 'River Rd'];
      return `${_.random(100, 9999)} ${streets[_.random(0, streets.length - 1)]}`;}
    case 'city':{
      const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Toronto', 'London', 'Berlin', 'Mumbai'];
      return cities[_.random(0, cities.length - 1)];}
    case 'country':{
      const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'China', 'Mexico', 'South Africa'];
      return countries[_.random(0, countries.length - 1)];}
    case 'zipCode':
      return _.random(10000, 99999).toString();
    case 'gender':{
      const genders = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Prefer not to say'];
      return genders[_.random(0, genders.length - 1)];}
    case 'sex':{
      const sexes = ['Male', 'Female', 'Intersex'];
      return sexes[_.random(0, sexes.length - 1)];}
    case 'username':{
      const prefix = _.times(_.random(3, 6), () => String.fromCharCode(_.random(97, 122))).join('');
      const suffix = _.random(0, 9999);
      return `${prefix}${suffix}`;}
    case 'password':{
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      return _.times(_.random(8, 16), () => chars[_.random(0, chars.length - 1)]).join('');}
    case 'avatar':
      return `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${_.random(1, 99)}.jpg`;
    case 'color':
      return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    case 'url':{
      const domains2 = ['example.com', 'test.org', 'demo.net', 'sample.io', 'mockup.co'];
      return `https://www.${domains2[_.random(0, domains2.length - 1)]}/${_.times(_.random(3, 8), () => String.fromCharCode(_.random(97, 122))).join('')}`;}
    case 'ipAddress':
      return `${_.random(1, 255)}.${_.random(0, 255)}.${_.random(0, 255)}.${_.random(0, 255)}`;
    case 'creditCard':{
      const ccPrefix = ['4', '5', '37', '34', '6011'][_.random(0, 4)];
      const ccDigits = _.times(16 - ccPrefix.length, () => _.random(0, 9)).join('');
      return `${ccPrefix}${ccDigits}`;}
    case 'paragraph':{
      const sentences = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.'
      ];
      return _.sampleSize(sentences, _.random(1, 3)).join(' ');}
    case 'jobTitle':{
      const jobTitles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Marketing Specialist', 
                        'Customer Support Representative', 'HR Manager', 'Sales Executive', 'UX Designer', 
                        'Financial Analyst', 'Operations Director'];
      return jobTitles[_.random(0, jobTitles.length - 1)];}
    case 'company':{
      const companies = ['Acme Inc.', 'TechCorp', 'GlobalSystems', 'Innovatech', 'Summit Industries', 
                        'Horizon Solutions', 'Apex Enterprises', 'Pinnacle Group', 'Quantum Dynamics', 'Nexus Corporation'];
      return companies[_.random(0, companies.length - 1)];}
    case 'currency':
      return `${(Math.random() * 10000).toFixed(2)}`;
    default:
      return 'Unknown type';
  }
};

// Generate data based on schema
export const generateData = (schema: FieldSchema[], count: number): GeneratedDataItem[] => {
  return _.times(count, () => {
    const item: GeneratedDataItem = {};
    schema.forEach(field => {
      if (field.required || Math.random() > 0.2) { // 80% chance to include non-required fields
        item[field.name] = generateRandomValue(field);
      }
    });
    return item;
  });
};

// Flatten nested data for table display
export const flattenData = (data: GeneratedDataItem[]): any[] => {
  if (!data || data.length === 0) return [];
  
  // Function to flatten a single nested object
  const flattenObject = (obj: any, prefix = ''): any => {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively flatten nested objects
        Object.assign(acc, flattenObject(obj[key], prefixedKey));
      } else if (Array.isArray(obj[key])) {
        // For arrays, add a stringified version for display
        acc[prefixedKey] = JSON.stringify(obj[key]);
      } else {
        // For primitive values, just add them with the prefixed key
        acc[prefixedKey] = obj[key];
      }
      
      return acc;
    }, {});
  };
  
  // Map through data and flatten each item
  return data.map(item => flattenObject(item));
};

// Get all column headers from flattened data
export const getAllHeaders = (data: any[]): string[] => {
  if (!data || data.length === 0) return [];
  const headerSet = new Set<string>();
  
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      headerSet.add(key);
    });
  });
  
  return Array.from(headerSet);
};

// Schema manipulation functions

// Add field to schema (handles nested fields)
export const addField = (
  schema: FieldSchema[], 
  parentPath: string = ''
): FieldSchema[] => {
  if (!parentPath) {
    // Add to root level
    return [...schema, { name: `field${schema.length + 1}`, type: 'string', required: false }];
  }

  // Find the parent field and add a nested field
  const newSchema = _.cloneDeep(schema);
  const pathParts = parentPath.split('.');
  
  // Function to recursively find and update the target field
  const updateNestedField = (fields: FieldSchema[], parts: string[], currentIndex: number): void => {
    if (currentIndex >= parts.length) return;
    
    const fieldName = parts[currentIndex];
    const fieldIndex = fields.findIndex(f => f.name === fieldName);
    
    if (fieldIndex === -1) return;
    
    if (currentIndex === parts.length - 1) {
      // We've found the parent, add a new field to its fields array
      const fieldsArray = fields[fieldIndex].fields || [];
      fields[fieldIndex].fields = [
        ...fieldsArray, 
        { name: `field${fieldsArray.length + 1}`, type: 'string', required: false }
      ];
    } else {
      // Continue traversing the path
      if (fields[fieldIndex].fields) {
        updateNestedField(fields[fieldIndex].fields, parts, currentIndex + 1);
      }
    }
  };
  
  updateNestedField(newSchema, pathParts, 0);
  return newSchema;
};

// Fixed removeField function for nested data
export const removeField = (schema: FieldSchema[], path: string): FieldSchema[] => {
  // Simple case: top-level field
  if (!path.includes('.')) {
    const index = parseInt(path);
    return schema.filter((_, i) => i !== index);
  }

  // For nested fields, we need to handle the path correctly
  const newSchema = _.cloneDeep(schema);
  const pathParts = path.split('.');
  
  // Helper function to recursively navigate the schema and remove the field
  const removeFieldByPath = (
    fields: FieldSchema[], 
    pathSegments: string[], 
    currentIndex: number
  ): void => {
    // If we've reached the parent of the field to remove
    if (currentIndex === pathSegments.length - 1) {
      const lastSegment = pathSegments[currentIndex];
      
      // Check if it's a numeric index or a field name
      if (/^\d+$/.test(lastSegment)) {
        // It's an index, so we can directly splice
        const indexToRemove = parseInt(lastSegment);
        if (indexToRemove >= 0 && indexToRemove < fields.length) {
          fields.splice(indexToRemove, 1);
        }
      } else {
        // It's a field name, so we find the index by name
        const fieldIndex = fields.findIndex(f => f.name === lastSegment);
        if (fieldIndex !== -1) {
          fields.splice(fieldIndex, 1);
        }
      }
      return;
    }
    
    // If we're still navigating the path
    const segment = pathSegments[currentIndex];
    let nextFields: FieldSchema[] | undefined;
    let nextIndex = -1;
    
    // Handle numeric segments (direct array indices)
    if (/^\d+$/.test(segment)) {
      nextIndex = parseInt(segment);
      if (nextIndex >= 0 && nextIndex < fields.length) {
        nextFields = fields[nextIndex].fields;
      }
    } 
    // Handle field name segments
    else {
      nextIndex = fields.findIndex(f => f.name === segment);
      if (nextIndex !== -1) {
        nextFields = fields[nextIndex].fields;
      }
    }
    
    // Special handling for when the next segment is "fields"
    const isNextSegmentFields = pathSegments[currentIndex + 1] === 'fields';
    
    if (isNextSegmentFields) {
      // Skip the "fields" segment and continue with the next one
      const nestedFields = fields[nextIndex].fields;
      if (nextIndex !== -1 && nestedFields && Array.isArray(nestedFields)) {
        removeFieldByPath(nestedFields, pathSegments, currentIndex + 2);
      }
    } else if (nextIndex !== -1 && nextFields) {
      // Continue with normal path traversal
      removeFieldByPath(nextFields, pathSegments, currentIndex + 1);
    }
  };
  
  // Start the recursive removal process
  removeFieldByPath(newSchema, pathParts, 0);
  
  return newSchema;
};

// Update field in schema (handles nested fields)
export const updateField = (
  schema: FieldSchema[], 
  path: string, 
  updatedField: Partial<FieldSchema>
): FieldSchema[] => {
  if (!path.includes('.')) {
    // Simple case: top-level field
    const index = parseInt(path);
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], ...updatedField };
    return newSchema;
  }

  // Nested case
  const pathParts = path.split('.');
  const newSchema = _.cloneDeep(schema);
  
  // Function to recursively find and update the target field
  const updateNestedField = (fields: FieldSchema[], parts: string[], currentIndex: number): void => {
    if (currentIndex >= parts.length) return;
    
    const part = parts[currentIndex];
    
    if (currentIndex === parts.length - 1) {
      // We've reached the target field
      const index = parseInt(part);
      if (!isNaN(index) && index >= 0 && index < fields.length) {
        fields[index] = { ...fields[index], ...updatedField };
      } else {
        // Find by name
        const fieldIndex = fields.findIndex(f => f.name === part);
        if (fieldIndex !== -1) {
          fields[fieldIndex] = { ...fields[fieldIndex], ...updatedField };
        }
      }
      return;
    }
    
    // Continue traversing the path
    let nextIndex = -1;
    
    // Try to parse as index first
    const index = parseInt(part);
    if (!isNaN(index) && index >= 0 && index < fields.length) {
      nextIndex = index;
    } else {
      // Try to find by name
      nextIndex = fields.findIndex(f => f.name === part);
    }
    
    if (nextIndex !== -1 && fields[nextIndex].fields && Array.isArray(fields[nextIndex].fields)) {
      const nestedFields = fields[nextIndex].fields;
      if (nestedFields) {
        updateNestedField(nestedFields, parts, currentIndex + 1);
      }
    } else if (nextIndex !== -1 && parts[currentIndex + 1] === 'fields') {
      // Initialize fields array if navigating to it and it doesn't exist
      if (!fields[nextIndex].fields) {
        fields[nextIndex].fields = [];
      }
      const nestedFields = fields[nextIndex].fields;
      if (nestedFields) {
        updateNestedField(nestedFields, parts, currentIndex + 2);
      }
    }
  };
  
  updateNestedField(newSchema, pathParts, 0);
  return newSchema;
};

// Move field up or down in the schema
export const moveField = (
  schema: FieldSchema[], 
  path: string, 
  direction: 'up' | 'down'
): FieldSchema[] => {
  if (!path.includes('.')) {
    // Simple case: top-level field
    const index = parseInt(path);
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === schema.length - 1)) {
      return schema; // Can't move further
    }
    
    const newSchema = [...schema];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSchema[index], newSchema[targetIndex]] = [newSchema[targetIndex], newSchema[index]];
    return newSchema;
  }

  // For nested fields, clone and update
  const pathParts = path.split('.');
  const newSchema = _.cloneDeep(schema);
  
  // Function to recursively find and move the target field
  const moveNestedField = (fields: FieldSchema[], parts: string[], currentIndex: number): void => {
    if (currentIndex >= parts.length - 1) {
      // We've reached the parent container, move the child field
      const fieldIndex = parseInt(parts[parts.length - 1]);
      
      if ((direction === 'up' && fieldIndex === 0) || 
          (direction === 'down' && fieldIndex === fields.length - 1)) {
        return; // Can't move further
      }
      
      const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
      [fields[fieldIndex], fields[targetIndex]] = [fields[targetIndex], fields[fieldIndex]];
      return;
    }
    
    const fieldName = parts[currentIndex];
    const fieldIndex = fields.findIndex(f => f.name === fieldName);
    
    if (fieldIndex === -1) return;
    
    if (fields[fieldIndex].fields) {
      moveNestedField(fields[fieldIndex].fields, parts, currentIndex + 1);
    }
  };
  
  moveNestedField(newSchema, pathParts, 0);
  return newSchema;
};

// Export data as JSON for download
export const dataToJsonBlob = (data: GeneratedDataItem[]): Blob => {
  const dataStr = JSON.stringify(data, null, 2);
  return new Blob([dataStr], { type: 'application/json' });
};

// Create download link for generated data
export const downloadJson = (data: GeneratedDataItem[], filename: string = 'generated-data.json'): void => {
  if (!data) return;
  
  const dataBlob = dataToJsonBlob(data);
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  
  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};