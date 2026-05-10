-- fct_video_performance: Fact table with measures + FK to dim_channels
-- Channel attributes accessed via JOIN, not embedded

with metrics as (
    select * from {{ ref('int_video_metrics') }}
),

niche_bench as (
    select * from {{ ref('int_niche_benchmarks') }}
),

final as (
    select
        -- Keys
        m.video_id,
        m.channel_id,          -- FK → dim_channels

        -- Video attributes
        m.title,
        m.upload_date,
        m.duration_seconds,
        m.duration_category,
        m.upload_day_of_week,
        m.upload_year,
        m.upload_month,
        m.tags,
        m.is_live,
        m.was_live,
        m.niche,
        m.region,

        -- Measures
        m.view_count,
        m.like_count,
        m.comment_count,

        -- Computed metrics
        m.like_rate,
        m.comment_rate,
        m.engagement_rate,
        m.views_per_subscriber,
        m.views_per_day,
        m.days_since_upload,
        m.title_length,
        m.title_word_count,

        -- Benchmark comparisons
        safe_divide(m.engagement_rate, n.avg_engagement_rate) as engagement_vs_benchmark,
        safe_divide(m.view_count, n.avg_views_per_video) as views_vs_benchmark,

        -- Performance tier
        case
            when safe_divide(m.view_count, n.avg_views_per_video) >= 3 then 'viral'
            when safe_divide(m.view_count, n.avg_views_per_video) >= 1.5 then 'above_average'
            when safe_divide(m.view_count, n.avg_views_per_video) >= 0.5 then 'average'
            else 'below_average'
        end as performance_tier

    from metrics m
    left join niche_bench n on m.niche = n.niche
)

select * from final
