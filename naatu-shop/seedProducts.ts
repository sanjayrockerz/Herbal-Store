import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from .env
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Missing Supabase environment variables")
  console.error("Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Product {
  name: string
  category: string
  price: number
  description: string
  benefits: string
  image: string
  stock: number
}

async function seedProducts() {
  try {
    // Read products.json
    const productsPath = path.join(__dirname, "products.json")
    const productsData = fs.readFileSync(productsPath, "utf-8")
    const products: Product[] = JSON.parse(productsData)

    console.log(`📚 Found ${products.length} products to seed...`)

    // Check if table already has products
    const { count, error: checkError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })

    if (checkError) {
      console.error("❌ Error checking existing products:", checkError.message)
      process.exit(1)
    }

    if ((count || 0) > 0) {
      console.warn(
        `⚠️  Warning: Products table already has ${count} products`
      )
      console.log(
        "📝 To clear and reseed, delete products from Supabase dashboard first"
      )
      process.exit(0)
    }

    // Insert products in batches of 10 to avoid timeout
    const batchSize = 10
    let insertedCount = 0

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, Math.min(i + batchSize, products.length))

      const { error: insertError } = await supabase
        .from("products")
        .insert(batch)

      if (insertError) {
        console.error(
          `❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
          insertError.message
        )
        process.exit(1)
      }

      insertedCount += batch.length
      console.log(
        `✅ Inserted ${insertedCount}/${products.length} products (${Math.round((insertedCount / products.length) * 100)}%)`
      )
    }

    console.log(`\n🎉 Database seeding successful!`)
    console.log(`✨ All ${products.length} products have been inserted into Supabase`)
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Seeding failed:", error.message)
    } else {
      console.error("❌ Seeding failed:", error)
    }
    process.exit(1)
  }
}

// Run seeding
seedProducts()
