from datetime import datetime

import polars as pl
from flask import request
from flask_appbuilder import expose
from flask_appbuilder.api import BaseApi
from loguru import logger
from orjson import orjson

from app.common.errors import EmptyDataFrameError
from app.common.request_utils import build_error_response
from app.insight.datasource.bqMetrics import BqMetrics
from app.insight.services.insight_builders import DFBasedInsightBuilder
from app.insight.services.metrics import AggregateMethod, SingleColumnMetric, DualColumnMetric, CombineMethod, DimensionValuePair, Filter
from app.insight.services.segment_insight_builder import get_related_segments, get_segment_insight


class InsightApi(BaseApi):
    resource_name = "insight"

    @staticmethod
    def parse_date_info(data):
        base_date_range = data['baseDateRange']
        comparison_date_range = data['comparisonDateRange']
        date_column = data['dateColumn']
        date_column_type = data['dateColumnType'] if 'dateColumnType' in data else 'date'

        baseline_start = datetime.strptime(
            base_date_range['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
        baseline_end = datetime.strptime(
            base_date_range['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
        comparison_start = datetime.strptime(
            comparison_date_range['from'], '%Y-%m-%dT%H:%M:%S.%fZ').date()
        comparison_end = datetime.strptime(
            comparison_date_range['to'], '%Y-%m-%dT%H:%M:%S.%fZ').date()

        return baseline_start, baseline_end, comparison_start, comparison_end, date_column, date_column_type

    @staticmethod
    def parse_filters(data):
        return [Filter(**filter) for filter in data['filters']]

    @staticmethod
    def parse_data(data):
        baseline_start, baseline_end, comparison_start, comparison_end, date_column, date_column_type = InsightApi.parse_date_info(data)
        group_by_columns = data['groupByColumns']
        filters = InsightApi.parse_filters(data)

        return (
            baseline_start, baseline_end, comparison_start, comparison_end, date_column, date_column_type, group_by_columns, filters
        )

    @staticmethod
    def parse_metrics(metric_column):
        agg_method_map = {
            "sum": AggregateMethod.SUM,
            "count": AggregateMethod.COUNT,
            "nunique": AggregateMethod.DISTINCT
        }

        if metric_column['aggregationOption'] == 'ratio':
            ratioMetric = metric_column['ratioMetric']

            numerator_filter = {
                ratioMetric['numerator']['filter']['column']: [
                    ratioMetric['numerator']['filter']['value']]
            } if 'filter' in ratioMetric['numerator'] else {}
            denominator_filter = {
                ratioMetric['denominator']['filter']['column']: [
                    ratioMetric['denominator']['filter']['value']]
            } if 'filter' in ratioMetric['denominator'] else {}
            numerator_agg_method = agg_method_map[ratioMetric['numerator']
            ['aggregationMethod']]
            denominator_agg_method = agg_method_map[ratioMetric['denominator']
            ['aggregationMethod']]

            numerator_metric = SingleColumnMetric(
                None,
                ratioMetric['numerator']['columnName'],
                numerator_agg_method,
                numerator_filter
            )
            denominator_metric = SingleColumnMetric(
                None,
                ratioMetric['denominator']['columnName'],
                denominator_agg_method,
                denominator_filter
            )

            metric = DualColumnMetric(
                name=metric_column['ratioMetric']['metricName'],
                combine_method=CombineMethod.RATIO,
                numerator_metric=numerator_metric,
                denominator_metric=denominator_metric)
        else:
            singular_filter = {
                metric_column['singularMetric']['filter']['column']: [
                    metric_column['singularMetric']['filter']['value']]
            } if 'filter' in metric_column['singularMetric'] else {}
            metric = SingleColumnMetric(
                None,
                metric_column['singularMetric']['columnName'],
                agg_method_map[metric_column['aggregationOption']],
                singular_filter
            )
        return metric

    @expose('bigquery/metric', methods=['POST'])
    def get_bq_insight(self):
        data = request.get_json()
        table_name = data['tableName']
        expected_value = data['expectedValue']

        (
            baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type, group_by_columns, filters
        ) = self.parse_data(data)

        metric = self.parse_metrics(data['metricColumn'])

        bq_metric = BqMetrics(
            table_name=table_name,
            baseline_period=(baselineStart, baselineEnd),
            comparison_period=(comparisonStart, comparisonEnd),
            date_column=date_column,
            date_column_type=date_column_type,
            metrics=[metric],
            columns=group_by_columns,
            expected_value=expected_value)
        return bq_metric.get_metrics()

    @expose('file/segment', methods=['POST'])
    def get_segment_insight(self):
        data = request.get_json()
        file_id = data['fileId']
        (baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type, group_by_columns, filters) = self.parse_data(data)

        metric = self.parse_metrics(data['metricColumn'])
        segment_key = data['segmentKey']
        filtering_clause = pl.lit(True)
        for sub_key in segment_key:
            filtering_clause = filtering_clause & (pl.col(
                sub_key['dimension']).cast(str).eq(pl.lit(sub_key['value'])))

        df = pl.read_csv(f'/tmp/dsensei/{file_id}') \
            .with_columns(pl.col(date_column).str.slice(0, 10).str.to_date().alias("date")) \
            .filter(filtering_clause)

        return orjson.dumps(
            get_segment_insight(
                df,
                date_column,
                (baselineStart, baselineEnd),
                (comparisonStart, comparisonEnd),
                [metric],
                filters
            )
        )

    @expose('file/related-segments', methods=['POST'])
    def get_related_segments(self):
        data = request.get_json()

        (baseline_start, baseline_end, comparison_start, comparison_end, date_column, date_column_type) = self.parse_date_info(data)
        metric_column = data['metricColumn']
        metric = self.parse_metrics(metric_column)
        filters = self.parse_filters(data)

        file_id = data['fileId']
        logger.info('Reading file')
        df = pl.read_csv(f'/tmp/dsensei/{file_id}') \
            .with_columns(pl.col(date_column).str.slice(0, 10).str.to_date().alias("date"))

        return orjson.dumps(
            get_related_segments(
                df,
                (baseline_start, baseline_end),
                (comparison_start, comparison_end),
                [DimensionValuePair(key_component['dimension'], key_component['value']) for key_component in data['segmentKey']],
                metric,
                filters
            )
        )

    @expose('file/metric', methods=['POST'])
    def get_insight(self):
        data = request.get_json()
        file_id = data['fileId']
        expected_value = data['expectedValue']
        (baselineStart, baselineEnd, comparisonStart, comparisonEnd, date_column, date_column_type, group_by_columns, filters) = self.parse_data(data)

        metric_column = data['metricColumn']
        metric = self.parse_metrics(metric_column)

        try:
            logger.info('Reading file')
            df = pl.read_csv(f'/tmp/dsensei/{file_id}') \
                .with_columns(pl.col(date_column).str.slice(0, 10).str.to_date(strict=False).alias("date"))

            logger.info('File loaded')
            insight_builder = DFBasedInsightBuilder(
                df,
                (baselineStart, baselineEnd),
                (comparisonStart, comparisonEnd),
                group_by_columns,
                [metric],
                expected_value,
                filters
            )
            return insight_builder.build()
        except EmptyDataFrameError:
            return build_error_response("EMPTY_DATASET"), 400
        except Exception as e:
            logger.exception(e)
            return build_error_response(str(e)), 500
