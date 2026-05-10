with videos as (
    select * from {{ ref('stg_videos') }}
),

channels as (
    select * from {{ ref('stg_channels') }}
),

metrics as (
    select
        v.video_id,
        v.title,
        v.channel_id,
        coalesce(c.channel_name, v.channel_name) as channel_name,
        v.upload_date,
        v.duration_seconds,
        v.duration_category,
        v.view_count,
        v.like_count,
        v.comment_count,
        v.niche,
        v.region,
        v.upload_day_of_week,
        v.upload_year,
        v.upload_month,
        v.tags,
        v.is_live,
        v.was_live,

        c.subscriber_count,
        c.size_tier,

        -- Engagement metrics
        safe_divide(v.like_count, v.view_count) as like_rate,
        safe_divide(v.comment_count, v.view_count) as comment_rate,
        safe_divide(v.like_count + v.comment_count, v.view_count) as engagement_rate,

        -- Performance vs channel size
        safe_divide(v.view_count, c.subscriber_count) as views_per_subscriber,

        -- Days since upload
        date_diff(current_date(), v.upload_date, day) as days_since_upload,

        -- Views per day (velocity)
        safe_divide(
            v.view_count,
            greatest(date_diff(current_date(), v.upload_date, day), 1)
        ) as views_per_day,

        -- Title analysis
        length(v.title) as title_length,
        array_length(split(v.title, ' ')) as title_word_count

    from videos v
    left join channels c on v.channel_id = c.channel_id
)

select * from metrics
