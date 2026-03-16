import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
