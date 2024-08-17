import request from '@/utils/request.js'



// 查询岗位详细
export function listPost(data) {
  return request({
    url: '/stock/myselfOption/page',
    method: 'post',
    data: data
  })
}

export function addStockForStrategy() {
  return request({
    url: '/stock/myselfOption/addStockForStrategy',
    method: 'post',
  })
}