with channels as (
    select * from {{ ref('int_channel_summary') }}
),

niche_stats as (
    select
        niche,

        count(*) as total_channels,
        countif(region = 'ID') as id_channels,
        countif(region = 'GLOBAL') as global_channels,

        -- Subscriber benchmarks
        avg(subscriber_count) as avg_subscribers,
        approx_quantiles(subscriber_count, 2)[offset(1)] as median_subscribers,

        -- View benchmarks
        avg(avg_views) as avg_views_per_video,
        avg(total_views) as avg_total_views,

        -- Engagement benchmarks
        avg(avg_engagement_rate) as avg_engagement_rate,
        avg(avg_like_rate) as avg_like_rate,
        avg(avg_comment_rate) as avg_comment_rate,

        -- Content benchmarks
        avg(avg_duration_seconds) as avg_duration,
        avg(total_videos) as avg_videos_per_channel,
        avg(avg_title_length) as avg_title_length,

        -- Activity
        avg(videos_last_30d) as avg_uploads_last_30d

    from channels
    group by 1
)

select * from niche_stats
