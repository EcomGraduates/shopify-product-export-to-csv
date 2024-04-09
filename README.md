# Shopify Products and Collections Export Tool

Shopify Products and Collections Export Tool is a Node.js command-line application designed to export product and collection data from Shopify stores into CSV files. This tool enables Shopify store owners and developers to easily back up their store data or migrate to another platform.

## Getting Started

Before using this tool, ensure you have Node.js and npm installed on your machine.

### Installation

1. Clone the repository: `git clone [Repository URL]`
2. Navigate to the project directory: `cd [Project Directory]`
3. Install NPM packages: `npm install`

### Dependencies

This tool relies on the following npm packages:

- `axios` - For making HTTP requests to the Shopify API.
- `fs` - For file system operations, such as creating and writing to files.
- `@fast-csv/format` - For formatting and exporting data to CSV files.
- `inquirer` - For interactive command line prompts.

## Usage

### Configuring the Tool

To use this tool, you must provide the base URL of your Shopify store as a command line argument. Optionally, you can specify the number of products per page, the maximum number of pages to fetch, the delay between requests, and the name of the output CSV file.

### Exporting Data

Run the script with the necessary command line arguments:

```
node shopify-export.js [Shopify Store URL] [Products Per Page] [Max Pages] [Request Delay] [CSV File Name]
```

- `[Shopify Store URL]` - The base URL of your Shopify store.
- `[Products Per Page]` - (Optional) Number of products to fetch per page. Defaults to 25.
- `[Max Pages]` - (Optional) Maximum number of pages to fetch. Defaults to 2.
- `[Request Delay]` - (Optional) Delay between requests in milliseconds. Defaults to 2000ms.
- `[CSV File Name]` - (Optional) Name of the output CSV file. (not applicable to collections)

### Examples

To export all products from the store:

```
node shopify-export.js https://yourshopifystore.com
```

To export products with custom configurations:

```
node shopify-export.js https://yourshopifystore.com 50 5 3000 custom_export.csv
```

## Contributing

Your contributions are welcome! If you have suggestions for improving this tool, please open an issue or submit a pull request.
