-- dim_channels: Pure channel dimension table
-- Only descriptive attributes, no aggregated measures

with channels as (
    select * from {{ ref('stg_channels') }}
)

select
    channel_id,
    channel_name,
    channel_url,
    niche,
    region,
    subscriber_count,
    size_tier,
    channel_description,
    scraped_at

from channels
