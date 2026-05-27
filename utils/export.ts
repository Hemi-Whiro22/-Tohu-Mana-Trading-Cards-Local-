import { Card } from '../types';

export const downloadTradeMeCSV = (cards: Card[]) => {
  // 1. The Headers TradeMe expects (61 columns format for My Products)
  const headers = [
    "product_id_for_member", "sku", "photo_id_list", "youtube_video_key", "stock_amount",
    "unlimited_stock", "category_id", "second_category_id", "dvd_catalogue_id", "title",
    "subtitle", "body", "is_new", "attributes", "is_legal_notice_read", "start_price",
    "reserve_price", "buy_now_price", "is_clearance", "was_price", "has_promo",
    "is_sold_multiple_quantities", "is_shipping_price_per_quantity_sold", "fpo_amount",
    "fpo_duration", "fpo_to", "av_bidders_only", "auction_length", "auction_end_time",
    "delivery_pickup_allowed", "delivery_must_pickup", "delivery_use_bookcourier_rates",
    "delivery_bookcourier_is_box", "delivery_bookcourier_bag_size",
    "delivery_bookcourier_selected_courier", "delivery_bookcourier_service_level",
    "delivery_bookcourier_no_restricted_items", "delivery_price", "payment_bank_deposit",
    "payment_credit_card", "payment_cash", "payment_afterpay", "payment_other",
    "send_payment_instructions", "display_bold", "gallery", "gallery_plus", "feature",
    "super_feature", "donation_recipient", "folder", "exclude_shipping_promotion",
    "listing_footer_enabled", "length_cm", "width_cm", "height_cm", "weight_kg", "brand",
    "manufacturer_code", "barcode_gtin", "update_active_listings"
  ];

  const rows = cards.map(card => {
    // Build Title (max 50 chars)
    const prefix = "DBS TCG - ";
    const suffix = ` [${card.cardNumber}]`;
    const availLen = 50 - prefix.length - suffix.length;
    let cleanName = card.name;
    if (cleanName.length > availLen) {
      cleanName = cleanName.substring(0, availLen - 3) + "...";
    }
    const title = `${prefix}${cleanName}${suffix}`;

    // Values in NZD (rate 1.63, matching the python generator)
    const nzdValue = card.estimatedValue * 1.63;
    const startPrice = nzdValue * 0.9;
    const buyNowPrice = nzdValue;

    // Extract photo filename from imageUrl
    const photoName = card.imageUrl.substring(card.imageUrl.lastIndexOf('/') + 1);

    // Reconstruct the 4-week trend strings using priceHistory
    const week1 = card.priceHistory?.[0]?.price !== undefined ? `${(card.priceHistory[0].price * 1.63).toFixed(2)}` : 'N/A';
    const week2 = card.priceHistory?.[1]?.price !== undefined ? `${(card.priceHistory[1].price * 1.63).toFixed(2)}` : 'N/A';
    const week3 = card.priceHistory?.[2]?.price !== undefined ? `${(card.priceHistory[2].price * 1.63).toFixed(2)}` : 'N/A';
    const week4 = card.priceHistory?.[3]?.price !== undefined ? `${(card.priceHistory[3].price * 1.63).toFixed(2)}` : 'N/A';

    const description = `
Dragon Ball Super Card Game card for sale:

• Card Name: ${card.name}
• Card Number: ${card.cardNumber}
• Set: ${card.setName}
• Rarity: Near Mint

Condition: Near Mint. Kept securely in sleeve (as shown in photos).

--- Packaging & Shipping ---
All single cards are packaged with care for maximum protection:
• Placed in a sleeve and loaded into a top loader (hard cover), securely sandwiched between two pieces of rigid cardboard to prevent bending in transit.
• Default Shipping: NZ Post Standard Envelope ($1.50 NZD)
• Tracked / Bulk Upgrade: Tracked Courier Bag ($6.00 NZD) - highly recommended for higher-value cards or multiple combined listings.

--- Pricing Transparency & Provenance ---
Calculated via Tohu Mana Trading pricing engine.
• Global Market Reference (PriceCharting/eBay): $${card.estimatedValue.toFixed(2)} USD
• NZD Base Conversion (Rate 1.63): $${nzdValue.toFixed(2)} NZD
• Final Buy Now Price: $${buyNowPrice.toFixed(2)} NZD

--- Value Trend (Past 4 Weeks) ---
• Week 1: $${week1} NZD
• Week 2: $${week2} NZD
• Week 3: $${week3} NZD
• Week 4: $${week4} NZD (Current)
• Trend Summary: Stable market valuation.

------------------------------------------------------
To view the full digital twin high-res scans, condition verification proof, and live value trends, visit: https://kaitiaki-o-te-awanui.net/tmt/?code=${card.tohuManaId}
`.trim();

    return [
      card.cardNumber.substring(0, 20), // product_id_for_member
      card.cardNumber, // sku
      photoName, // photo_id_list
      "", // youtube_video_key
      "1", // stock_amount
      "False", // unlimited_stock
      "0202-3193-3194-", // category_id (Leaf Gaming > Trading cards > Dragonball Z)
      "", // second_category_id
      "", // dvd_catalogue_id
      `"${title.replace(/"/g, '""')}"`, // title
      "", // subtitle
      `"${description.replace(/"/g, '""')}"`, // body
      "True", // is_new
      "", // attributes
      "True", // is_legal_notice_read
      startPrice.toFixed(2), // start_price
      "", // reserve_price
      buyNowPrice.toFixed(2), // buy_now_price
      "False", // is_clearance
      "", // was_price
      "False", // has_promo
      "False", // is_sold_multiple_quantities
      "False", // is_shipping_price_per_quantity_sold
      "", // fpo_amount
      "", // fpo_duration
      "", // fpo_to
      "False", // av_bidders_only
      "7", // auction_length
      "", // auction_end_time
      "False", // delivery_pickup_allowed
      "False", // delivery_must_pickup
      "False", // delivery_use_bookcourier_rates
      "False", // delivery_bookcourier_is_box
      "", // delivery_bookcourier_bag_size
      "", // delivery_bookcourier_selected_courier
      "", // delivery_bookcourier_service_level
      "False", // delivery_bookcourier_no_restricted_items
      `"1.50=NZ Post Standard Letter;6.00=Tracked Courier Bag"`, // delivery_price
      "True", // payment_bank_deposit
      "True", // payment_credit_card
      "False", // payment_cash
      "False", // payment_afterpay
      "", // payment_other
      "True", // send_payment_instructions
      "False", // display_bold
      "True", // gallery
      "False", // gallery_plus
      "False", // feature
      "False", // super_feature
      "", // donation_recipient
      `"DBS Single Cards"`, // folder
      "False", // exclude_shipping_promotion
      "False", // listing_footer_enabled
      "0", // length_cm
      "0", // width_cm
      "0", // height_cm
      "0.01", // weight_kg
      `"Dragon Ball Super TCG"`, // brand
      card.cardNumber, // manufacturer_code
      "", // barcode_gtin
      "False" // update_active_listings
    ];
  });

  // Convert to CSV string ensuring newlines are well-formed
  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `TradeMe_Listings_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Your original listings export (useful for your own records)
export const downloadTohuManaListings = (cards: Card[]) => {
  const headers = ["Tohu Mana ID", "Name", "Set Name", "Card Number", "Condition", "Estimated Value", "Last Updated", "Image URL"];
  const rows = cards.map(card => [
    card.tohuManaId || 'TM-GEN-01',
    `"${card.name}"`,
    `"${card.setName}"`,
    `"${card.cardNumber}"`,
    card.condition,
    card.estimatedValue.toFixed(2),
    card.lastUpdated,
    card.imageUrl
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `tohu_mana_internal_log.csv`);
  link.click();
};

// Your original listings export (useful for your own records)
export const downloadRawCSV = (cards: Card[]) => {
  const headers = ["ID", "Tohu Mana ID", "Name", "Set Name", "Card Number", "Condition", "Estimated Value", "Last Updated", "Image URL", "Grade Overall", "Grade Centering", "Grade Edges", "Grade Corners", "Grade Surface"];
  const rows = cards.map(card => [
    card.id,
    card.tohuManaId || 'TM-GEN-01',
    `"${card.name}"`,
    `"${card.setName}"`,
    `"${card.cardNumber}"`,
    card.condition,
    card.estimatedValue.toFixed(2),
    card.lastUpdated,
    card.imageUrl,
    card.grade?.overall?.toString() || '',
    card.grade?.centering?.toString() || '',
    card.grade?.edges?.toString() || '',
    card.grade?.corners?.toString() || '',
    card.grade?.surface?.toString() || ''
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `tohu_mana_raw_export.csv`);
  link.click();
}
