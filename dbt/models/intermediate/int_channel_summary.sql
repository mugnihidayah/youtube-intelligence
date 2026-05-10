with videos as (
    select * from {{ ref('int_video_metrics') }}
),

channel_stats as (
    select
        channel_id,
        channel_name,
        niche,
        region,
        subscriber_count,
        size_tier,

        -- Video counts
        count(*) as total_videos,
        countif(days_since_upload <= 30) as videos_last_30d,
        countif(days_since_upload <= 7) as videos_last_7d,

        -- View stats
        sum(view_count) as total_views,
        avg(view_count) as avg_views,
        max(view_count) as max_views,
        min(view_count) as min_views,

        -- Engagement stats
        avg(engagement_rate) as avg_engagement_rate,
        avg(like_rate) as avg_like_rate,
        avg(comment_rate) as avg_comment_rate,

        -- Performance
        avg(views_per_subscriber) as avg_views_per_sub,
        avg(views_per_day) as avg_views_per_day,

        -- Content patterns
        avg(duration_seconds) as avg_duration_seconds,
        avg(title_length) as avg_title_length,

        -- Upload consistency
        min(upload_date) as earliest_video,
        max(upload_date) as latest_video,
        countif(is_live or was_live) as live_video_count

    from videos
        group by 1, 2, 3, 4, 5, 6
        having channel_name is not null and trim(channel_name) != ''
)

select * from channel_stats
