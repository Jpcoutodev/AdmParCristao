
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pettfehkjvndxcoxalqm.supabase.co'
const supabaseKey = 'sb_publishable_1ZOemykPR3R2pgj9dhWvNw_VgeKg5Rs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchProfile() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error)
    } else {
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]))
        } else {
            console.log('No profiles found')
        }
    }
}

fetchProfile()
