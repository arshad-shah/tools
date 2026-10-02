import _ from 'lodash';
import type {
  FieldSchema,
  FlattenedRow,
  GeneratedDataItem,
  GeneratedValue,
} from '../types';

// Generate a random value based on field type
export const generateRandomValue = (field: FieldSchema): GeneratedValue => {
  const { type, min, max, fields, arraySize } = field;

  switch (type) {
    case 'object': {
      if (!fields || fields.length === 0) return {};

      const obj: Record<string, GeneratedValue> = {};
      fields.forEach((nestedField) => {
        if (nestedField.required || Math.random() > 0.2) {
          // 80% chance to include non-required fields
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
      return _.times(_.random(5, 10), () =>
        String.fromCharCode(_.random(97, 122)),
      ).join('');
    case 'number':
      return _.random(min || 0, max || 100);
    case 'boolean':
      return Math.random() > 0.5;
    case 'uuid':
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    case 'fullName': {
      const firstNames = [
        'John',
        'Jane',
        'Michael',
        'Emily',
        'David',
        'Sarah',
        'James',
        'Emma',
        'Maria',
        'Chen',
        'Aisha',
        'Carlos',
      ];
      const lastNames = [
        'Smith',
        'Johnson',
        'Williams',
        'Brown',
        'Jones',
        'Miller',
        'Davis',
        'Garcia',
        'Rodriguez',
        'Wilson',
        'Patel',
        'Kim',
      ];
      return `${firstNames[_.random(0, firstNames.length - 1)]} ${lastNames[_.random(0, lastNames.length - 1)]}`;
    }
    case 'firstName': {
      const fNames = [
        'John',
        'Jane',
        'Michael',
        'Emily',
        'David',
        'Sarah',
        'James',
        'Emma',
        'Robert',
        'Jennifer',
        'Mohammed',
        'Sophia',
        'Wei',
        'Fatima',
      ];
      return fNames[_.random(0, fNames.length - 1)];
    }
    case 'lastName': {
      const lNames = [
        'Smith',
        'Johnson',
        'Williams',
        'Brown',
        'Jones',
        'Miller',
        'Davis',
        'Garcia',
        'Rodriguez',
        'Wilson',
        'Lee',
        'Nguyen',
        'Patel',
        'Kim',
      ];
      return lNames[_.random(0, lNames.length - 1)];
    }
    case 'email': {
      const domains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'example.com',
        'company.co',
      ];
      const nameChars = _.times(_.random(5, 8), () =>
        String.fromCharCode(_.random(97, 122)),
      ).join('');
      return `${nameChars}@${domains[_.random(0, domains.length - 1)]}`;
    }
    case 'phone':
      return `(${_.random(100, 999)}) ${_.random(100, 999)}-${_.random(1000, 9999)}`;
    case 'date': {
      const start = new Date(2000, 0, 1);
      const end = new Date();
      return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime()),
      )
        .toISOString()
        .split('T')[0];
    }
    case 'dateTime': {
      const startDt = new Date(2000, 0, 1);
      const endDt = new Date();
      return new Date(
        startDt.getTime() +
          Math.random() * (endDt.getTime() - startDt.getTime()),
      ).toISOString();
    }
    case 'address': {
      const streets = [
        'Main St',
        'Park Ave',
        'Oak Ln',
        'Maple Rd',
        'Washington Blvd',
        'Cedar St',
        'Highland Ave',
        'River Rd',
      ];
      return `${_.random(100, 9999)} ${streets[_.random(0, streets.length - 1)]}`;
    }
    case 'city': {
      const cities = [
        'New York',
        'Los Angeles',
        'Chicago',
        'Houston',
        'Phoenix',
        'Philadelphia',
        'San Antonio',
        'San Diego',
        'Toronto',
        'London',
        'Berlin',
        'Mumbai',
      ];
      return cities[_.random(0, cities.length - 1)];
    }
    case 'country': {
      const countries = [
        'USA',
        'Canada',
        'UK',
        'Australia',
        'Germany',
        'France',
        'Japan',
        'Brazil',
        'India',
        'China',
        'Mexico',
        'South Africa',
      ];
      return countries[_.random(0, countries.length - 1)];
    }
    case 'zipCode':
      return _.random(10000, 99999).toString();
    case 'gender': {
      const genders = [
        'Male',
        'Female',
        'Non-binary',
        'Genderfluid',
        'Prefer not to say',
      ];
      return genders[_.random(0, genders.length - 1)];
    }
    case 'sex': {
      const sexes = ['Male', 'Female', 'Intersex'];
      return sexes[_.random(0, sexes.length - 1)];
    }
    case 'username': {
      const prefix = _.times(_.random(3, 6), () =>
        String.fromCharCode(_.random(97, 122)),
      ).join('');
      const suffix = _.random(0, 9999);
      return `${prefix}${suffix}`;
    }
    case 'password': {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      return _.times(
        _.random(8, 16),
        () => chars[_.random(0, chars.length - 1)],
      ).join('');
    }
    case 'avatar':
      return `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${_.random(1, 99)}.jpg`;
    case 'color':
      return `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')}`;
    case 'url': {
      const domains2 = [
        'example.com',
        'test.org',
        'demo.net',
        'sample.io',
        'mockup.co',
      ];
      return `https://www.${domains2[_.random(0, domains2.length - 1)]}/${_.times(_.random(3, 8), () => String.fromCharCode(_.random(97, 122))).join('')}`;
    }
    case 'ipAddress':
      return `${_.random(1, 255)}.${_.random(0, 255)}.${_.random(0, 255)}.${_.random(0, 255)}`;
    case 'creditCard': {
      const ccPrefix = ['4', '5', '37', '34', '6011'][_.random(0, 4)];
      const ccDigits = _.times(16 - ccPrefix.length, () => _.random(0, 9)).join(
        '',
      );
      return `${ccPrefix}${ccDigits}`;
    }
    case 'paragraph': {
      const sentences = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
      ];
      return _.sampleSize(sentences, _.random(1, 3)).join(' ');
    }
    case 'jobTitle': {
      const jobTitles = [
        'Software Engineer',
        'Product Manager',
        'Data Scientist',
        'Marketing Specialist',
        'Customer Support Representative',
        'HR Manager',
        'Sales Executive',
        'UX Designer',
        'Financial Analyst',
        'Operations Director',
      ];
      return jobTitles[_.random(0, jobTitles.length - 1)];
    }
    case 'company': {
      const companies = [
        'Acme Inc.',
        'TechCorp',
        'GlobalSystems',
        'Innovatech',
        'Summit Industries',
        'Horizon Solutions',
        'Apex Enterprises',
        'Pinnacle Group',
        'Quantum Dynamics',
        'Nexus Corporation',
      ];
      return companies[_.random(0, companies.length - 1)];
    }
    case 'currency':
      return `${(Math.random() * 10000).toFixed(2)}`;
    default:
      return 'Unknown type';
  }
};

// Generate data based on schema
export const generateData = (
  schema: FieldSchema[],
  count: number,
): GeneratedDataItem[] => {
  return _.times(count, () => {
    const item: GeneratedDataItem = {};
    schema.forEach((field) => {
      if (field.required || Math.random() > 0.2) {
        // 80% chance to include non-required fields
        item[field.name] = generateRandomValue(field);
      }
    });
    return item;
  });
};

// Flatten nested data for table display
export const flattenData = (data: GeneratedDataItem[]): FlattenedRow[] => {
  if (!data || data.length === 0) return [];

  // Function to flatten a single nested object
  const flattenObject = (
    obj: Record<string, unknown>,
    prefix = '',
  ): FlattenedRow => {
    return Object.keys(obj).reduce((acc: FlattenedRow, key: string) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        // Recursively flatten nested objects
        Object.assign(
          acc,
          flattenObject(obj[key] as Record<string, unknown>, prefixedKey),
        );
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
  return data.map((item) => flattenObject(item));
};

// Get all column headers from flattened data
export const getAllHeaders = (data: FlattenedRow[]): string[] => {
  if (!data || data.length === 0) return [];
  const headerSet = new Set<string>();

  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      headerSet.add(key);
    });
  });

  return Array.from(headerSet);
};

// Export data as JSON for download
export const dataToJsonBlob = (data: GeneratedDataItem[]): Blob => {
  const dataStr = JSON.stringify(data, null, 2);
  return new Blob([dataStr], { type: 'application/json' });
};
