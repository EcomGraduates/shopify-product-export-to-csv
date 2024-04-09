#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';
import { format } from '@fast-csv/format';
import inquirer from 'inquirer';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const baseUrl = process.argv[2]; // Get the base URL from command line argument
const shopifyStore = baseUrl.match(/(?:https?:\/\/)?(?:www\.)?([^\.]+)/)[1];
const productsEndpoint = '/products.json?limit=';
const metaEndpoint = '/meta.json';
const collectionsEndpoint = '/collections.json?limit=250&page=';
const productLimit = process.argv[3] ? process.argv[3] : 25; // Set the product limit from command line argument or default to 50
const pageLimit = process.argv[4] ? process.argv[4] : 2 // Set the maximum page number from command line argument or default to 2
const requestDelay = process.argv[5] ? process.argv[5] : 2000; // Set the delay between requests from command line argument or default to 2000ms
const csvFileName = process.argv[6] ? `${process.argv[6].replace('.csv', '')}.csv` : `shopify_products_export_${shopifyStore}.csv`; // Set the CSV file name from command line argument or default to shopify_products_export_{store}.csv

// Fetch meta data to get total products count
async function fetchMetaData() {
    const url = `${baseUrl}${metaEndpoint}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching meta data:', error);
        return null;
    }
}

// Fetch all products with limits and delay
async function fetchAllProducts(totalProducts) {
    const totalPages = Math.min(Math.ceil(totalProducts / productLimit), pageLimit);
    let products = [];

    for (let page = 1; page <= totalPages; page++) {
        const url = `${baseUrl}${productsEndpoint}${productLimit}&page=${page}`;
        try {
            const response = await axios.get(url);
            products = products.concat(response.data.products);
            console.log(`Fetched page ${page} of ${totalPages}`);
            if (page < totalPages) await sleep(requestDelay); // Delay to prevent hitting rate limits
        } catch (error) {
            console.error(`Error fetching products for page ${page}:`, error);
        }
    }

    return products;
}

// Fetch products from a specific collection
async function fetchProductsFromCollection(collectionHandle) {
    const url = `${baseUrl}/collections/${collectionHandle}/products.json?limit=${productLimit}`;
    try {
        const response = await axios.get(url);
        return response.data.products;
    } catch (error) {
        console.error(`Error fetching products from collection ${collectionHandle}:`, error);
        return [];
    }
}

// Fetch all collections
async function fetchCollections(totalCollections) {
    const totalPages = Math.ceil(totalCollections / 250);
    let collections = [];

    for (let page = 1; page <= totalPages; page++) {
        const url = `${baseUrl}${collectionsEndpoint}${page}`;
        try {
            const response = await axios.get(url);
            collections = collections.concat(response.data.collections);
            console.log(`Fetched collection page ${page} of ${totalPages}`);
            if (page < totalPages) await sleep(requestDelay); // Delay to prevent hitting rate limits
        } catch (error) {
            console.error(`Error fetching collections for page ${page}:`, error);
        }
    }

    return collections;
}

// map Shopify product data to CSV row
function mapProductToCsvRow(product) {
    let productRows = [];

    product.variants.forEach((variant, index) => {
        let row = {
            Handle: product.handle,
            Title: index === 0 ? product.title : '',
            'Body (HTML)': index === 0 ? product.body_html : '',
            Vendor: index === 0 ? product.vendor : '',
            Type: index === 0 ? product.product_type : '',
            Tags: index === 0 ? product.tags.join(', ') : '',
            Published: index === 0 ? 'TRUE' : '',
            'Variant SKU': variant.sku,
            'Variant Grams': variant.grams,
            'Variant Inventory Qty': variant.inventory_quantity,
            'Variant Image': variant.featured_image ? variant.featured_image.src : '',
            'Variant Price': variant.price,
            'Variant Compare At Price': variant.compare_at_price,
            'Variant Requires Shipping': variant.requires_shipping ? 'TRUE' : 'FALSE',
            'Variant Taxable': variant.taxable ? 'TRUE' : 'FALSE',
            'Variant Barcode': variant.barcode,
            'Image Src': index === 0 ? product.images[0]?.src || '' : '',
            'Image Position': index === 0 ? '1' : '',
            'Image Alt Text': index === 0 ? product.images[0]?.alt || '' : '',
            'Status': 'active'
        };

        // Dynamically add option names and values based on the product's options
        product.options.forEach((option, optionIndex) => {
            row[`Option${optionIndex + 1} Name`] = option.name;
            row[`Option${optionIndex + 1} Value`] = variant[`option${optionIndex + 1}`] || '';
        });

        productRows.push(row);
    });

    return productRows;
}

function generateCSV(products, fileName) {
    const writableStream = fs.createWriteStream(`./${fileName}.csv`);

    writableStream.on('finish', () => {
        console.log(`CSV generation complete for ${fileName}.csv`);
    });

    const csvStream = format({ headers: true });
    csvStream.pipe(writableStream);

    products.forEach(product => {
        const rows = mapProductToCsvRow(product);
        rows.forEach(row => {
            csvStream.write(row);
        });
    });

    csvStream.end();
}

async function main() {
    if (!baseUrl) {
        console.error('Please provide a base URL as a command line argument.');
        process.exit(1);
    }

    const metaData = await fetchMetaData();
    if (!metaData) {
        console.error('Error fetching meta data. Exiting.');
        process.exit(1);
    }

    const totalProducts = metaData.published_products_count;
    const totalCollections = metaData.published_collections_count;

    const { exportType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'exportType',
            message: 'Do you want to export all products or from specific collections?',
            choices: ['All Products', 'Specific Collections']
        }
    ]);

    if (exportType === 'All Products') {
        if (totalProducts > 0) {
            const products = await fetchAllProducts(totalProducts);
            generateCSV(products, csvFileName);
        } else {
            console.log('No products found.');
        }
    } else if (exportType === 'Specific Collections') {
        const collections = await fetchCollections(totalCollections);
        const { selectedCollections } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedCollections',
                message: 'Select the collections you want to export:',
                choices: collections.map((collection, index) => ({
                    name: `${collection.title} (${collection.products_count} products)`,
                    value: collection.handle
                }))
            }
        ]);

        for (const collectionHandle of selectedCollections) {
            const products = await fetchProductsFromCollection(collectionHandle);
            generateCSV(products, `${shopifyStore}_collection_${collectionHandle}_products_export`);
        }
    }
}

main();