// Uses globals: parseAkirakokiRows, parseRawDataRows, detectCSVFormat,
//               getAkirakokiMinLen, getDatasetColor (from utils.js plain script)

export function buildAkirakokiDataset(id, name, color, pd) {
  const minLen = getAkirakokiMinLen(pd);
  if (!minLen) throw new Error('No usable data rows');
  return {
    id, name, color,
    totalTime: pd.time[minLen - 1] || '',
    time:   pd.time.slice(0, minLen),
    weight: pd.weight.slice(0, minLen),
    flow:   pd.flow.slice(0, minLen),
    temp:   pd.temp.length ? pd.temp.slice(0, minLen) : new Array(minLen).fill(0)
  };
}

export function buildRawDataset(id, name, color, parsed) {
  if (!parsed) return null;
  const { date, beanWeight, timeLabels, pWC, pWF, bC, bF, temp } = parsed;
  return {
    id, name, color, date, beanWeight,
    totalTime: timeLabels[timeLabels.length - 1] || '',
    time: timeLabels, weight: pWC, flow: pWF, temp,
    metrics: {
      'Pouring water cumulative(g)': pWC,
      'Pour water flow rate(g/s)':   pWF,
      'Brewing cumulative(g)':        bC,
      'Brewing flow rate(g/s)':       bF,
      'Temperature(℃)':              temp
    }
  };
}
