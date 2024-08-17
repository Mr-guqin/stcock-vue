import request from '@/utils/request.js'



// 查询岗位详细
export function queryKLineByStockNo(stockNo) {
  return request({
    url: '/stock/history/queryKLineByStockNo?stockNo=' + stockNo,
    method: 'get'
  })

}export function queryFenShiLineByStockNo(stockNo) {
  return request({
    url: '/stock/myselfOption/queryFenShiLineByStockNo?stockNo=' + stockNo,
    method: 'get'
  })

}