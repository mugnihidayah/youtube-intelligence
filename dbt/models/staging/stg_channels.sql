with source as (
    select * from {{ source('youtube_raw', 'raw_channels') }}
),

deduplicated as (
    select
        *,
        row_number() over (
            partition by channel_id
            order by scraped_at desc
        ) as row_num
    from source
),

cleaned as (
    select
        channel_id,
        coalesce(channel_name, config_name) as channel_name,
        channel_url,
        subscriber_count,
        description as channel_description,
        niche,
        region,
        config_name,
        cast(scraped_at as timestamp) as scraped_at,

        case
            when subscriber_count >= 10000000 then 'mega'
            when subscriber_count >= 1000000 then 'large'
            when subscriber_count >= 100000 then 'medium'
            when subscriber_count >= 10000 then 'small'
            else 'micro'
        end as size_tier

    from deduplicated
    where channel_id is not null
        and row_num = 1
        and coalesce(channel_name, config_name, '') != ''
)

select * from cleaned
