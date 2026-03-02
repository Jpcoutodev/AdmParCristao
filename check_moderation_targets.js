
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pettfehkjvndxcoxalqm.supabase.co'
const supabaseKey = 'sb_publishable_1ZOemykPR3R2pgj9dhWvNw_VgeKg5Rs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchemas() {
    console.log("Checking posts schema...")
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .limit(1)

    if (postsError) console.error("Error posts:", postsError)
    else if (posts.length > 0) console.log("Posts columns:", Object.keys(posts[0]))
    else console.log("No posts found")

    console.log("Checking post_comments schema...")
    const { data: comments, error: commentsError } = await supabase
        .from('post_comments')
        .select('*')
        .limit(1)

    if (commentsError) console.error("Error comments:", commentsError)
    else if (comments.length > 0) console.log("Comments columns:", Object.keys(comments[0]))
    else console.log("No comments found")
}

checkSchemas()
