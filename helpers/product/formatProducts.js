const formatProductResponse = (product) => {
  let hasVariants = false;
  const variants = product.variantsData || product.variants || [];
  if (Array.isArray(variants) && variants.length > 0) {
    hasVariants = true;
  }


  return {
    _id: product._id,
    name: product.name, 
    priority: product.priority,
    store: product.store
      ? {
          _id: product.store._id,
          name: product.store.name,
          createdAt: product.store.createdAt,
          updatedAt: product.store.updatedAt,
        }
      : null,
    brand: product.brand
      ? {
          _id: product.brand._id,
          name: product.brand.name,
          createdAt: product.brand.createdAt,
          updatedAt: product.brand.updatedAt,
        }
      : null,
    category: product.category
      ? {
          _id: product.category._id,
          name: product.category.name,
          description: product.category.description,
        }
      : null,
    description: hasVariants
      ? variants[0]?.attributes?.description || product.description
      : product.description,
    hasVariants: hasVariants,
    sku: hasVariants ? variants[0]?.sku : product.sku,
    price: hasVariants ? variants[0]?.price : product.price,
    offerPrice: hasVariants ? variants[0]?.offerPrice : product.offerPrice,
    stock: hasVariants ? variants[0]?.stock : product.stock,
    mainImage:
      hasVariants &&
      Array.isArray(variants[0]?.images) &&
      variants[0]?.images.length > 0
        ? variants[0].images[0]
        : Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null,
    createdBy: product.createdBy
      ? {
          _id: product.createdBy._id,
          username: product.createdBy.username,
          email: product.createdBy.email,
          role: product.createdBy.role,
        }
      : null,
    label: product.label,
    averageRating: product.averageRating,
    totalRatings: product.totalRatings,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,

    stockStatus: hasVariants
      ? //check all variants stock status if all are out of stock then return out of stock else return in stock also  check more than one variant is there becuase if there is only one variant then return that variant stock status.
        variants.length > 1
        ? variants.every((variant) => variant.stockStatus === "outofstock")
          ? "outofstock"
          : "instock"
        : variants[0].stockStatus
      : product.stockStatus,
    activeStatus: product.activeStatus,
  };
};

module.exports = formatProductResponse;
