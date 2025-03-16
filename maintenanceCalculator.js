// 计算指定年月的天数
function 获取月份天数(年, 月) {
    return new Date(年, 月 + 1, 0).getDate();
}

// 计算两个日期之间的实际天数
function 计算实际天数(开始日期, 结束日期) {
    const 开始 = new Date(开始日期);
    const 结束 = new Date(结束日期);
    
    // 将两个日期都设置为当天的0点以确保精确计算
    开始.setHours(0, 0, 0, 0);
    结束.setHours(0, 0, 0, 0);
    
    // 使用毫秒计算天数差
    const 天数差毫秒 = 结束.getTime() - 开始.getTime();
    const 天数 = Math.floor(天数差毫秒 / (1000 * 60 * 60 * 24));
    
    return 天数;
}

// 解析里程数：清理非数字字符并转换为整数
function 解析里程(里程字符串) {
    if (!里程字符串) return 0;
    const 清理后字符串 = 里程字符串.toString().replace(/[^\d]/g, '');
    return parseInt(清理后字符串, 10) || 0;
}

// 保养配置对象
const 保养配置 = {
    // 燃油车配置
    燃油: {
        // 首保配置
        首保: {
            5000: {
                月数: 7,        // 7个月期限
                里程: 6000      // 6000公里限制
            },
            10000: {
                月数: 13,       // 13个月期限
                里程: 11000     // 11000公里限制
            }
        },
        // 例保配置
        例保: {
            月数: 13,          // 13个月期限
            里程: 11000        // 11000公里限制
        }
    },
    // 电动车配置
    电动: {
        月数: 13,             // 13个月期限
        里程: 21000           // 21000公里限制
    }
};

function calculateDateDiff(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    // 调整月份差值
    if (days < 0) {
        months--;
        // 获取上个月的最后一天
        const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += lastMonth.getDate();
    }

    // 调整年份差值
    if (months < 0) {
        years--;
        months += 12;
    }

    return {
        years,
        months,
        days
    };
}

function isOverdue(dateDiff, configMonths) {
    // 转换为月份总数进行比较
    const totalMonths = dateDiff.years * 12 + dateDiff.months;
    
    if (totalMonths > configMonths) {
        // 如果月份数大于配置月份，直接超期
        return (totalMonths - configMonths) * 30 + dateDiff.days;
    } else if (totalMonths === configMonths) {
        // 如果月份数相等，检查天数
        return dateDiff.days > 0 ? dateDiff.days : 0;
    }
    
    return 0;
}

// 修改计算保养期限规定日期的方法
function 计算规定保养日期(起始日期, 月数) {
    const 起始 = new Date(起始日期);
    const 规定日期 = new Date(起始);
    
    // 获取起始日期的天数
    const 起始天数 = 起始.getDate();
    
    // 先设置月份
    规定日期.setMonth(规定日期.getMonth() + 月数);
    
    // 检查月底问题
    const 月底 = 获取月份天数(规定日期.getFullYear(), 规定日期.getMonth());
    if (起始天数 > 月底) {
        // 如果起始日期的天数超过了目标月份的最大天数，则设置为月底
        规定日期.setDate(月底);
    }
    
    return 规定日期;
}

function calculateMaintenance(params) {
    const {
        vehicleType,
        selectedMileage,
        maintenanceDate,
        currentMileage,
        maintenanceCount,
        saleDate,
        previousMaintenanceDate,
        previousMileage
    } = params;

    // 获取当前日期和销售日期
    const currentDate = new Date(maintenanceDate);
    const saleDateTime = new Date(saleDate);

    // 如果日期无效，返回错误
    if (isNaN(currentDate.getTime()) || isNaN(saleDateTime.getTime())) {
        return {
            message: "日期无效",
            status: "error"
        };
    }

    // 根据车辆类型判断
    if (vehicleType === 'fuel') {
        // 燃油车逻辑
        if (maintenanceCount === 1) {
            // 首保判断
            const config = 保养配置.燃油.首保[selectedMileage];
            if (!config) {
                return {
                    message: "首保里程配置错误",
                    status: "error"
                };
            }

            // 计算从销售日期到规定保养期限的日期
            const 规定日期 = new Date(saleDateTime);
            规定日期.setMonth(规定日期.getMonth() + config.月数);
            
            // 计算实际超期天数
            let overdueDays = 0;
            if (currentDate > 规定日期) {
                overdueDays = 计算实际天数(规定日期.toISOString().split('T')[0], maintenanceDate) + 1; // +1 包含开单当天
            }

            let messages = [];
            if (overdueDays > 0) {
                messages.push(`超期 ${overdueDays} 天`);
            }
            if (currentMileage > config.里程) {
                messages.push(`超出 ${currentMileage - config.里程} 公里`);
            }

            if (messages.length > 0) {
                return {
                    message: messages.join('，'),
                    status: "overdue"
                };
            }
        } else {
            // 例保判断
            if (!previousMaintenanceDate) {
                return {
                    message: "缺少上次保养日期",
                    status: "error"
                };
            }

            const prevDate = new Date(previousMaintenanceDate);
            if (isNaN(prevDate.getTime())) {
                return {
                    message: "上次保养日期无效",
                    status: "error"
                };
            }

            const config = 保养配置.燃油.例保;
            // 使用新的计算规定日期的函数
            const 规定日期 = 计算规定保养日期(previousMaintenanceDate, config.月数);

            // 计算实际超期天数
            let overdueDays = 0;
            if (currentDate > 规定日期) {
                // 使用精确的计算方法
                const 规定日期字符串 = 规定日期.toISOString().split('T')[0];
                overdueDays = 计算实际天数(规定日期字符串, maintenanceDate) + 1; // +1 包含开单当天
            }

            const mileageDiff = currentMileage - previousMileage;

            let messages = [];
            if (overdueDays > 0) {
                messages.push(`超期 ${overdueDays} 天`);
            }
            if (mileageDiff > config.里程) {
                messages.push(`超出 ${mileageDiff - config.里程} 公里`);
            }

            if (messages.length > 0) {
                return {
                    message: messages.join('，'),
                    status: "overdue"
                };
            }
        }
    } else if (vehicleType === 'electric') {
        // 电动车逻辑
        const config = 保养配置.电动;
        
        if (maintenanceCount === 1) {
            // 计算规定保养期限日期
            const 规定日期 = new Date(saleDateTime);
            规定日期.setMonth(规定日期.getMonth() + config.月数);

            // 计算实际超期天数
            let overdueDays = 0;
            if (currentDate > 规定日期) {
                overdueDays = 计算实际天数(规定日期.toISOString().split('T')[0], maintenanceDate) + 1;
            }

            let messages = [];
            if (overdueDays > 0) {
                messages.push(`超期 ${overdueDays} 天`);
            }
            if (currentMileage > config.里程) {
                messages.push(`超出 ${currentMileage - config.里程} 公里`);
            }

            if (messages.length > 0) {
                return {
                    message: messages.join('，'),
                    status: "overdue"
                };
            }
        } else {
            // 后续保养，从上次保养日期开始计算
            if (!previousMaintenanceDate) {
                return {
                    message: "缺少上次保养日期",
                    status: "error"
                };
            }

            const prevDate = new Date(previousMaintenanceDate);
            if (isNaN(prevDate.getTime())) {
                return {
                    message: "上次保养日期无效",
                    status: "error"
                };
            }

            // 计算规定保养期限日期
            const 规定日期 = new Date(prevDate);
            规定日期.setMonth(规定日期.getMonth() + config.月数);

            // 计算实际超期天数
            let overdueDays = 0;
            if (currentDate > 规定日期) {
                overdueDays = 计算实际天数(规定日期.toISOString().split('T')[0], maintenanceDate) + 1; // +1 包含开单当天
            }

            const mileageDiff = currentMileage - previousMileage;

            let messages = [];
            if (overdueDays > 0) {
                messages.push(`超期 ${overdueDays} 天`);
            }
            if (mileageDiff > config.里程) {
                messages.push(`超出 ${mileageDiff - config.里程} 公里`);
            }

            if (messages.length > 0) {
                return {
                    message: messages.join('，'),
                    status: "overdue"
                };
            }
        }
    }

    return {
        message: "正常",
        status: "normal"
    };
}

// 将函数添加到全局作用域
window.calculateMaintenance = calculateMaintenance;

// 在计算按钮点击事件中添加
calculateBtn.addEventListener('click', function() {
    // ... 现有计算逻辑 ...

    // 遍历所有记录项进行计算
    const recordItems = document.querySelectorAll('.record-item');
    
    // 用于记录最后一次保养日期
    let lastMaintenanceDate = null;

    recordItems.forEach((item, index) => {
        const cells = item.querySelectorAll('.record-cell');
        const maintenanceDate = cells[2].textContent;

        // 跳过无效日期的记录
        if (maintenanceDate === '-') return;

        // 更新最后一次保养日期
        lastMaintenanceDate = maintenanceDate;
    });

    // 检查终身保修状态
    const warrantyStatusDisplay = document.getElementById('warrantyStatusDisplay');
    
    if (lastMaintenanceDate) {
        const hasLostWarranty = checkLifetimeWarranty(lastMaintenanceDate);
        
        if (hasLostWarranty) {
            warrantyStatusDisplay.textContent = `⚠️ 车辆已丧失终身保修权益`;
            // 可以添加额外的样式来突出显示
            warrantyStatusDisplay.style.color = 'red';
            warrantyStatusDisplay.style.fontWeight = 'bold';
            // 确保显示
            warrantyStatusDisplay.style.display = 'block';
        } else {
            // 如果没有超过13个月，清空内容并隐藏
            warrantyStatusDisplay.textContent = '';
            warrantyStatusDisplay.style.display = 'none';
        }
    } else {
        // 没有保养记录时也隐藏
        warrantyStatusDisplay.textContent = '';
        warrantyStatusDisplay.style.display = 'none';
    }
}); 