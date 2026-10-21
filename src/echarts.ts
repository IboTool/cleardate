// Only the ECharts pieces the timeline uses, to keep the bundle small.
import { CustomChart, LineChart } from 'echarts/charts';
import { AxisPointerComponent, DataZoomComponent, GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

use([LineChart, CustomChart, GridComponent, TooltipComponent, AxisPointerComponent, DataZoomComponent, GraphicComponent, CanvasRenderer]);

export * from 'echarts/core';
