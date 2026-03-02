
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pettfehkjvndxcoxalqm.supabase.co'
const supabaseKey = 'sb_publishable_1ZOemykPR3R2pgj9dhWvNw_VgeKg5Rs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugModeration() {
    console.log("Fetching raw moderation data...")
    const { data, error } = await supabase
        .from('moderation')
        .select('*')
        .limit(10)

    if (error) {
        console.error('Error fetching moderation:', error)
        return
    }

    console.log(`Found ${data.length} items.`)
    if (data.length > 0) {
        console.log("Sample item:", data[0])
        console.log("Verified values:", data.map(i => i.verified))

        // Check join
        console.log("Checking join with profiles...")
        const { data: joinData, error: joinError } = await supabase
            .from('moderation')
            .select('*, profiles(name)')
            .limit(5)

        if (joinError) {
            console.error("Error joining profiles:", joinError)
        } else {
            console.log("Join sample:", JSON.stringify(joinData[0], null, 2))
        }
    }
}

debugModeration()
