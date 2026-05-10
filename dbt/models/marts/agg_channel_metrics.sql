-- agg_channel_metrics: Aggregated video metrics per channel
-- Separated from dim_channels to maintain star schema purity

select * from {{ ref('int_channel_summary') }}
