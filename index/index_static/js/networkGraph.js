/*
* @project: NetworkGraph
* @file: networkGraph.js
* @author: dangzhiteng
* @email: 642212607@qq.com
* @date: 2019.5.14
*/

// 定义右键菜单选项
var node_menu = [
    [
        {
            text: "展开节点",
            func: function() {
                // id为节点id
                var id = Number($(this).attr("id"));
                var click_node = d3.select(this);
                var node_data = click_node.datum();
                if (node_data.border === true) {
                    alert("此节点为边界节点，无法展开。");
                }
                $.post("expand", JSON.stringify({ "node": { "label": node_data.label, "name": node_data.name} }), function(cur_data, status){
                    var cur_data = JSON.parse(cur_data);
                    var need_redraw = false;
                    cur_data.nodes.forEach(function(cur_node) {
                        var add = true;
                        data.nodes.forEach(function(node) {
                            if (cur_node.id === node.id) {
                                add = false;
                            }
                        })
                        if(add === true) { 
                            data.nodes.push(cur_node); 
                            need_redraw = true;
                        }
                    })
                    cur_data.links.forEach(function(cur_link) {
                        var add = true;
                        data.links.forEach(function(link) {
                            if (cur_link.source === link.source.id && cur_link.target === link.target.id) {
                                add = false;
                            }
                        })
                        if(add === true) { 
                            data.links.push(cur_link); 
                            need_redraw = true;
                        }
                    })
                    if (need_redraw === true) {
                        updateData(data);
                    }
                    else {
                        node_data["border"] = true;
                        click_node.append("text")
                            .attr("class", "tip")
                            .attr("transform", "translate(15, -15)")
                            .text("×");
                    }
                });
            }
        },
        {
            text: "创建关系",
            func: function() {
                var node_data = d3.select(this).datum();
                var drag_line = temp_layout.append("line")
                    .attr("stroke", "#00FFFB")
                    .style("stroke-width", 1)
                    .style("opacity", "0")
                    .attr("x1", node_data.x)
                    .attr("y1", node_data.y)
                    .attr("marker-end", "url(#resolved)");
                container.on("mousemove.add-link", function() {
                    translate_scale_rotate = getTranslateAndScaleAndRotate("#network-graph");
                    scale = translate_scale_rotate.k;
                    drag_line.attr("x2", (d3.event.x - translate_scale_rotate.x) / scale)
                        .attr("y2", (d3.event.y - translate_scale_rotate.y) / scale);
                    drag_line.style("opacity", 1);
                });
                node_elements.selectAll("circle")
                    .classed("cursor-target", true)
                    .on("click.add-link", function(node) {
                        drag_line.attr("x2", node.x)
                            .attr("y2", node.y);
                        var new_data = {"source": node_data.id, "target": node.id, "label": "test"};
                        data.links.push(new_data);
                        updateData(data);
                        drag_line.remove();
                        clearEvents();
                    });
            }
        },
        {
            text: "删除节点",
            func: function() {
                removeNode(d3.select(this).datum());
                updateData(data);
            }
        },
        {
            text: "选中父节点",
            func: function() {
                select_nodes(0);
            }
        },        
        {
            text: "选中子节点",
            func: function() {
                select_nodes(1);
            }
        },        
        {
            text: "选中同级",
            func: function() {
                select_nodes(2);
            }
        },        
        {
            text: "选中关联",
            func: function() {
                select_nodes(3);
            }
        }
    ]
];

var link_menu = [
    [
        {
            text: "删除关系",
            func: function() {
                this.remove();
                data.links.splice(d3.select(this).datum().index, 1);
                updateData(data);
            }
        }
    ]
];

var create_menu = [
    [
        {
            text: "创建节点",
            func: function() {
                var attr_table = d3.select("#attr-table")
                    .style("display", "block");
                var new_data = {
                    id: 0,
                    label: "default",
                    name: ""
                };
                d3.select("#create-confirm")
                    .on("click", function() {
                        clearEvents();
                        attr_table.style("display", "none");
                        for (attr in new_data) {
                            new_data[attr] = document.getElementById("create-" + attr).value;
                        }
                        create_node(new_data);
                        clearEvents();
                    });
                d3.select("#create-cancel")
                    .on("click", function() {
                        attr_table.style("display", "none");
                    });
            }
        },
        {
            text: "全部展开",
            func: function() {
                alert("还没写");
            }
        }
    ]
];

// 初始化三个变量 节点/关系/关系文字/对象
var node_elements = null;
var link_elements = null;
var link_text_elements = null;

// 用来记录新建节点的 x y 坐标
var create_x = 0;
var create_y = 0;

var linkForce = d3.forceLink()
    .id(function (link) { return link.id })
    .strength(NETWORKCONFIG.gravitation);

var simulation = d3.forceSimulation()
    .force("link", linkForce)
    .on("end", function() {
        stopLayout();
    });

// 更新数据
updateData(data);

function updateData(data) {
    drawNetworkGraph(data);
    drawBarGraph(data);
    updateLabels(data);
}

function setNetworkInfo(data) {
    d3.select("#node-num").text("节点数目：" + data.nodes.length);
    d3.select("#link-num").text("关系数目：" + data.links.length);
}

function drawNetworkGraph(data) {
	setNetworkInfo(data);
    startLayout();
    if (NETWORKCONFIG.layout_style === 0) {
        linkForce.strength(NETWORKCONFIG.gravitation);
        simulation.alpha(1)
            .alphaDecay(0.002)
            .alphaMin(0.002)
            .force("r", null)
            .force("charge", d3.forceManyBody().strength(NETWORKCONFIG.repulsion).distanceMax(400))
            .force("center", d3.forceCenter((window.innerWidth - 30) / 2, (window.innerHeight - 30) / 2))
            .force("collision", d3.forceCollide(NETWORKCONFIG.node_size));
    }
    else if (NETWORKCONFIG.layout_style === 1){
        data.nodes.forEach(function(node) {
            node.x = 0;
            node.y = 0;
        })
        linkForce.strength(0);
        simulation.force("charge", d3.forceCollide().radius(NETWORKCONFIG.node_size * 1.5))
            .force("r", d3.forceRadial(300, (window.innerWidth - 30) / 2, (window.innerHeight - 30) / 2))
            .alpha(5)
            .alphaDecay(0.1)
            .alphaMin(0.02);
    }
    else if(NETWORKCONFIG.layout_style === 2) {
        drawTree();
    }

    // 连线对象
    link_elements = link_layout.selectAll("path")
        .data(data.links);
    link_elements.exit().remove();
    link_elements = link_elements.enter()
        .append("path")
        .attr("class", "link")
        .merge(link_elements)
        .attr("id", function(link, i){ return "link-" + i; })
        .style("stroke-width", function(link) {
            if(!("width" in link)) {
                link["width"] = NETWORKCONFIG.link_width;
            }
            return link.width;
        })
        .attr("class", function(link) {
            if("style" in link) {
                return link_styles[link.style];
            } else {
                link["style"] = NETWORKCONFIG.link_style;
                return;
            }
        })
        .on("mousedown.select-link", select_link)
        .on("mouseover.hover-link", hover_link);

    // 连线的文字
    link_text_elements = text_layout.selectAll("text")
        .data(data.links);
    link_text_elements.exit().remove();
    link_text_elements = link_text_elements.enter()
        .append("text")
        .attr("class", "link-text")
        .style("font-size", 10)
        .merge(link_text_elements)
        .style("display", SHOWCONFIG.link_text == true ? "block" : "none");
    link_text_elements.selectAll("textPath").remove();
    link_text_elements.append("textPath")
        .attr("xlink:href", function (link, i) { return "#link-" + i; })
        .text(function(link) { return link.label; });

    // 节点对象
    node_elements = node_layout.selectAll(".node")
        .data(data.nodes);
    node_elements.exit().remove();
    node_elements = node_elements.enter()
        .append("g")
        .attr("class", "node")
        .merge(node_elements)
        .on("mousedown.select-node", select_node)
        .on("mouseover.hover-link", hover_node)
        .call(d3.drag()
        .on("start", drag_start)
        .on("drag", draging)
        .on("end", drag_end));
    node_elements.selectAll("circle").remove();
    node_elements.append("circle")
        .attr("r", function(node) {
            if(!("size" in node)) {
                node["size"] = NETWORKCONFIG.node_size;
            }
            return node.size;
        });
    fill_circle();

    simulation.nodes(data.nodes)
        .on("tick", tick)
        .force("link")
        .links(data.links);
    simulation.restart();

    // 绑定右键菜单
    $(".node").smartMenu(node_menu, {
        name: "node_menu"
    });
    $(".link").smartMenu(link_menu, {
        name: "link_menu"
    });
}

function fill_text() {
    let item = arguments[0] ? arguments[0] : "name"; 
    node_elements.selectAll("text").remove();
    node_elements.append("text")
        .attr("class", "node-text")
        .attr("dy", ".35em")
        .attr("x", function (node) {
            return textBreaking(d3.select(this), node[item]);
        })
        .style("display", SHOWCONFIG.node_text === true ? "block" : "none");
    node_elements.filter(function(node) { return node.border === true; })
        .append("text")
        .attr("class", "tip")
        .attr("transform", "translate(15, -15)")
        .text("x");
}
$("#container").smartMenu(create_menu, {
    name: "create_menu"
});

function tick() {
    node_elements.attr("transform", function(node) { return "translate(" + node.x + "," + node.y + ")"; });
    link_elements.attr("d", function(link) { return genLinkPath(link, NETWORKCONFIG.link_style); })
        .attr("marker-end", "url(#resolved)");
    link_text_elements.attr("dx", function(link) { return getLinkTextDx(link); });
}

// 点击清空所有选中
container.on("click", function() {
    if (d3.event.ctrlKey === false) {
        d3.selectAll(".selected")
            .classed("selected", false);
        d3.selectAll(".finded")
            .classed("finded", false);
        d3.selectAll(".route")
            .classed("route", false);
        node_elements.each(function(node) {
            node.selected = false;
        });
        link_elements.each(function(link) {
            link.selected = false;
        });
    }
    else if (d3.event.which === 3) {
        create_x = d3.event.x;
        create_y = d3.event.y;
    }
});

// 清除所有临时绑定
function clearEvents() {
    container.on("mousemove.add-link", null);
    node_elements.selectAll("circle")
            .on("click.add-link", null)
            .classed("cursor-target", false);
    temp_layout.selectAll("line").remove();
}

// 新建节点
function create_node(node) {
    var translate_scale_rotate = getTranslateAndScaleAndRotate("#network-graph");
    node.x = (create_x - translate_scale_rotate.x) / translate_scale_rotate.k;
    node.y = (create_y - translate_scale_rotate.y) / translate_scale_rotate.k;
    data.nodes.push(node);
    updateData(data);
}

// 删除节点
function removeNode(node) {
    data.nodes.splice(node.index, 1);
    data.links = data.links.filter(function(link) {
        if (link.source !== node && link.target !== node) {
            return true;
        }
    });

    node_elements.filter(function(cur_node) {
        if (cur_node === node) {
            return true;
        }
    }).remove();

    link_elements.filter(function(link) {
        if (link.source === node || link.target === node) {
            return true;
        }
    }).remove();

    link_text_elements.filter(function(link) {
        if (link.source === node || link.target === node) {
            return true;
        }
    }).remove();
}

// 颜色标记
d3.selectAll(".color-item")
    .on("click", function() {
        var click_item = d3.select(this);
        markColor(click_item.style("background-color"));
        d3.select("#color-marker")
            .style("left", this.offsetLeft + 2 + "px")
            .style("color", click_item.style("background-color"));
    });

d3.select("#node-color").on("change", function () {
    markColor(this.value);
});

function markColor(color_value) {
    var select_elements = d3.selectAll(".selected");
    var find_elements = d3.selectAll(".finded");
    select_elements.each(function(node) {
        node["color"] = color_value;
    });
    find_elements.each(function(node) {
        node["color"] = color_value;
    });
    fill_circle();
}

// 调整图参数
// 吸引力
d3.select("#gravitation").on("input propertychange", function() {
	NetworkGraph.change_gravitation(this.value);
});

// 排斥力
d3.select("#repulsion").on("input propertychange", function() {
    NetworkGraph.change_repulsion(-this.value);
});



// 节点大小缩放比例
d3.select("#nodes-size").on("input propertychange", function() {
    let scale = this.value;
    node_elements.each(function(node) {
        d3.select(this)
            .select("circle")
            .attr("r", node.size * scale);
        d3.selectAll("image")
            .attr("width", node.size * scale * 2)
            .attr("height", node.size * scale * 2);
    })
    // d3.select("marker").attr("refX", NETWORKCONFIG.node_size + 7);
});

// 边宽缩放比例
d3.select("#links-width")
    .on("input propertychange", function() {
        let scale = this.value;
        link_elements.style("stroke-width", function(link) {
            return link.width * scale;
        });
});

// 边类型
var link_style_buttons = d3.selectAll(".link-type");
link_style_buttons.on("click", function() {
        link_style_buttons.classed("high-light", false);
        d3.select(this).classed("high-light", true);
        NETWORKCONFIG.link_type = this.value;
        tick();
    });

// 布局方式
var layout_styles = d3.selectAll(".layout-style");
layout_styles.on("click", function() {
        if (this.value === "2") {
            alert("点击右下方进入github协助完成树图布局。");
            return;
        }
        layout_styles.classed("high-light", false);
        d3.select(this).classed("high-light", true)
        NETWORKCONFIG.layout_style = parseInt(this.value);
        drawNetworkGraph(data);
    })

// 分析模式
d3.select("#analyse-mode")
    .on("click", function() {
        NETWORKCONFIG.analyse_mode = !NETWORKCONFIG.analyse_mode;
        d3.select("#analyse-switch").attr("class", NETWORKCONFIG.analyse_mode === true ? "fa fa-toggle-on" : "fa fa-toggle-off");
        fill_circle();
    });

// 节点设置
// 节点大小
d3.select("#node-size")
    .on("input propertychange", function() {
        let r = this.value;
        node_elements.each(function(node) {
            if (node.selected === true) {
                d3.select(this)
                    .select("circle")
                    .attr("r", node.size = r);
            }
        })
});

// 节点透明度
d3.select("#node-opacity")
    .on("input propertychange", function() {
        let opacity = this.value;
        node_elements.each(function(node) {
            if (node.selected === true) {
                d3.select(this)
                    .select("circle")
                    .attr("fill-opacity", node.opacity = opacity);
            }
        })
});

// 边设置
// 边宽
d3.select("#link-width")
    .on("input propertychange", function() {
        let width = this.value;
        link_elements.each(function(link) {
            if (link.selected === true) {
                d3.select(this)
                    .style("stroke-width", link.width = width);
            }
        })
});

// 边颜色
d3.select("#link-color")
    .on("change", function() {
    d3.selectAll(".link")
        .style("stroke", this.value);
    d3.select("marker")
        .select("path")
        .style("fill", this.value)
        .style("stroke", this.value);
});

// 边样式
const link_styles = ["style-0", "style-55", "style-1010", "style-2010"]
d3.selectAll(".link-style")
    .on("click", function() {
        let style = link_styles[this.value];
        link_elements.each(function(link) {
            if (link.selected === true) {
                for (var i = 0; i < 4; i++) {
                    d3.select(this)
                        .classed(link_styles[i], false);
                }
                d3.select(this)
                    .classed(style, true);
            }
        })
});
  

// // 节点轮廓宽度
// d3.select("#node-stroke").on("input propertychange", function() {
//     node_elements.select("circle").style("stroke-width", this.value);
// });

function fill_circle() {
    if (NETWORKCONFIG.analyse_mode === true) {
        node_elements.select("circle")
            .style("fill", function(node) {
                return (node.label != "undefined" && support_labels.indexOf(node.label) > -1) ? "url(#" + node.label + ")" : "url(#default)";
            })
            .style("stroke", function(node) {
                if ("color" in node) {
                    return node.color;
                }
                else {
                    var color_index = support_labels.indexOf(node.label);
                    node["color"] = color(color_index > -1 ? color_index : 0);
                    return node.color;
                }
            });
    }
    else {
        node_elements.select("circle")
            .style("fill", function(node) {
                if ("color" in node) {
                    return node.color;
                }
                else {
                    var color_index = support_labels.indexOf(node.label);
                    node["color"] = color( color_index > -1 ? color_index : 0);
                    return node.color;
                }
            })
            .style("stroke", function(node) {
                return "white";
            });
    }
}

// 节点拖拽
function drag_start(node) {
    stopLayout();
    d3.event.sourceEvent.stopPropagation();
}

function draging(node) {
    node_elements.filter(function(d) { return d.selected; })
        .each(function (node) {
            node.x += d3.event.dx;
            node.y += d3.event.dy;
            d3.select(this).attr("transform", "translate(" + node.x + "," + node.y + ")");
        });
    link_elements.attr("d", function(link) { return genLinkPath(link, NETWORKCONFIG.link_style); });
    link_text_elements.attr("dx", function(link) { return getLinkTextDx(link); });
}

function drag_end(node) {
    if (!d3.event.sourceEvent.ctrlKey) {
        node.selected = false;
        d3.select(this).classed("selected", false);
    }
}

// 布局 开始/暂停 按钮
d3.select("#stop-button").on("click", function() {
    NETWORKCONFIG.calculating === true ? stopLayout() : startLayout();
});

// 开始布局
function startLayout() {
    NETWORKCONFIG.calculating = true;
    d3.select("#network-status").style("animation", "calc ease 1s infinite");
    d3.select("#stop-button-text").text("停止布局");
    simulation.alpha(1).restart();
}

// 停止布局
function stopLayout() {
    NETWORKCONFIG.calculating = false;
    d3.select("#network-status").style("animation", "none");
    d3.select("#stop-button-text").text("重新布局");
    simulation.stop();
}

// 掠过显示节点信息
function hover_node(node) {
    let exclude_attr = ["x", "y", "vx", "vy", "selected", "previouslySelected",
                        "color", "id", "label", "name", "size", "index"];
    d3.selectAll(".temp-node").remove();
    d3.select("#node-index").text("index: " + node["index"]);
    d3.select("#node-name").text("name: " + node["name"]);
    d3.select("#node-label").text("label: " + node["label"]);
    for (var key in node) {
        if (exclude_attr.indexOf(key.toString()) != -1) {
            continue;
        }
        d3.select("#node-info").append("p")
            .attr("class", "temp-node")
            .text(key + ": " + node[key]);
    }
}

// 点击选中节点
function select_node(node) {
    stopLayout();
    d3.select(this).classed("finded", false);
    node["selected"] = true;
    d3.select(this).classed("selected", true);
    if (d3.event.ctrlKey === 3) {
        d3.event.sourceEvent.stopPropagation();
    } 
}

// 点击选中关系
function select_link(link) {
    link["selected"] = true;
    d3.select(this).classed("selected", true);
    if (d3.event.ctrlKey === 3) {
        d3.event.sourceEvent.stopPropagation();
    }
}

// 掠过显示关系信息
function hover_link(link) {
    let exclude_attr = ["index", "source", "target", "label"];
    d3.selectAll(".temp-link").remove();
    d3.select("#link-label").text("label: " + link.label);
    d3.select("#link-source").text("source: " + link.source.name);
    d3.select("#link-target").text("target: " + link.target.name);
    for(var key in link){
        if(exclude_attr.indexOf(key.toString()) != -1) {
            continue;
        }
        d3.select("#link-info").append("p")
            .attr("class", "temp-link")
            .text(key + ": " + link[key]);                  
    }
}

// 查找节点
d3.select("#search-lineedit")
    .on("keypress", function() {
        if (d3.event.key === "Enter") {
            find_node_name();
        }
    });
d3.select("#search-button")
    .on("click", find_node_name);

function find_node_name() {
    var node_name = $("#search-lineedit").val();
    var is_find = false;
    node_elements.each(function(node) {
        if (node.name === node_name) {
            d3.select(this).classed("finded", true);
            is_find = true;
        }
    })
    if (is_find === false) {
        alert("未查找到此节点");
    }
}

// 最短路径查找
d3.select("#begin-find")
    .on("click", function() {
        var source_index = parseInt($("#source-node-index").val());
        var target_index = parseInt($("#target-node-index").val());
        if (source_index === "" || target_index === "" || source_index === "NAN" || target_index === "NAN") {
            alert("请正确输入源节点和目标节点index！");
            return
        }
        var paths = find_route(data, source_index, target_index);
        paths.forEach(function(path) {
            link_elements.each(function(link) {
                if ((path.indexOf(link.source.index) > -1) && (path.indexOf(link.target.index) > -1)) {
                    d3.select(this).classed("route", true);
                }
            });
        });
    });

function updateLabels(data) {
    let exclude_attr = ["x", "y", "vx", "vy", "selected", "previouslySelected",
                        "color", "size", "index"];
    let label_bar_ul = d3.select("#labels-bar").select("ul");
    label_bar_ul.selectAll("*").remove();
    data.nodes.forEach(node => {
        for(let attr in node) {
            if (exclude_attr.indexOf(attr) === -1) {
                label_bar_ul.append("li")
                    .attr("class", "labels")
                    .attr("id", "id-" + attr)
                    .text(attr);
                exclude_attr.push(attr);
            }
        }
    })
    fill_text();
    d3.select("#id-name")
        .classed("labels-high-light", true);
    d3.selectAll(".labels")
        .on("click", function() {
            d3.selectAll(".labels-high-light")
                .classed("labels-high-light", false);
            d3.select(this)
                .classed("labels-high-light", true);
            fill_text($(this)[0].textContent);
        })
}

// 渐变 先不用
// radial_gradient = defs_layout.append("radialGradient")
//     .attr("id", "orange_red")
//     .attr("cx", "50%")
//     .attr("cy", "50%")
//     .attr("r", "50%")
//     .attr("fx", "50%")
//     .attr("fy", "50%");
// radial_gradient.append("stop")
//     .attr("offset", "0%")
//     .attr("stop-color", "blue");
// radial_gradient.append("stop")
//     .attr("offset", "50%")
//     .attr("stop-color", "orange");
// radial_gradient.append("stop")
//     .attr("offset", "100%")
//     .attr("stop-color", "red");