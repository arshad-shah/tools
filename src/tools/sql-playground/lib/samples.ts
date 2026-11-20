/** A small sample database: two related tables and a query to try. */
export const SAMPLE_TABLES = [
  {
    name: 'customers.csv',
    text: [
      'id,name,country,joined',
      '1,Ada Lovelace,UK,2023-01-14',
      '2,Grace Hopper,US,2023-02-03',
      '3,Alan Turing,UK,2023-03-22',
      '4,Katherine Johnson,US,2023-05-09',
      '5,Edsger Dijkstra,NL,2023-07-30',
    ].join('\n'),
  },
  {
    name: 'orders.csv',
    text: [
      'id,customer_id,product,quantity,price',
      '101,1,Notebook,3,4.5',
      '102,2,Pen,10,1.2',
      '103,1,Lamp,1,24.99',
      '104,3,Notebook,2,4.5',
      '105,4,Chair,1,89',
      '106,2,Lamp,2,24.99',
      '107,5,Pen,5,1.2',
      '108,3,Chair,1,89',
    ].join('\n'),
  },
];

export const SAMPLE_QUERY = `-- Revenue per customer, highest first
SELECT c.name, c.country,
       count(o.id) AS orders,
       round(sum(o.quantity * o.price), 2) AS revenue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY revenue DESC;`;

export const STARTER_QUERY = `-- Load CSV, TSV, JSON or SQLite files, then query them here.
-- Run with Ctrl+Enter (Cmd+Enter on a Mac).
SELECT sqlite_version() AS version;`;
