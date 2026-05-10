with source as (
    select * from {{ source('youtube_raw', 'raw_videos') }}
),

cleaned as (
    select
        video_id,
        title,
        description,
        channel_name,
        channel_id,
        channel_url,
        cast(upload_date as date) as upload_date,
        duration_seconds,
        view_count,
        like_count,
        comment_count,
        tags,
        categories,
        thumbnail_url,
        language,
        is_live,
        was_live,
        niche,
        region,
        cast(scraped_at as timestamp) as scraped_at,

        -- Derived: video duration category
        case
            when duration_seconds < 60 then 'short'
            when duration_seconds < 600 then 'medium'
            when duration_seconds < 3600 then 'long'
            else 'very_long'
        end as duration_category,

        -- Derived: upload day of week (1=Sunday, 7=Saturday)
        extract(dayofweek from cast(upload_date as date)) as upload_day_of_week,

        -- Derived: upload hour (not available from scrape, but keep for future)
        extract(year from cast(upload_date as date)) as upload_year,
        extract(month from cast(upload_date as date)) as upload_month

    from source
    where video_id is not null
)

select * from cleaned
