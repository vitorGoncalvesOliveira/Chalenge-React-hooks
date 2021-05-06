import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart')

     if (storagedCart) {
       return JSON.parse(storagedCart);       
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
    const produtos = await api.get(`/products/${productId}`);
    const estoque = await api.get<Stock>(`/stock/${productId}`);
    const { data } = produtos;   
    const productAlreadyInCart = cart.find(produto => produto.id === productId);
    const { data: qtdInStock } = estoque;
      
    if(productAlreadyInCart){

      if(productAlreadyInCart.amount < qtdInStock.amount){

        const newCart = cart.map(produto =>{
          if(produto.id === productAlreadyInCart.id){
            produto.amount += 1;
          }
          return produto;
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);

      }
      else{
        toast.error('Quantidade solicitada fora de estoque');
      }
    }else{

      data.amount = 1;
      let newCart = [...cart, data];
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);

    }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const index = cart.findIndex(produto => productId === produto.id);
      if(index < 0){
        return toast.error('Erro na remoção do produto');
      }else{
        const newCart = cart.filter(produto => productId !== produto.id )
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      }
    } catch {
      return toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const request = await api.get<Stock>(`/stock/${productId}`);
      if(amount < 1){
        toast.error('Erro na alteração de quantidade do produto');  
        return;
      }

      const { data: estoque } = request;
      if( estoque.amount > amount){

        const newCart = cart.map(product =>{
          if(product.id === productId)
            product.amount = amount;
          
          return product;
        })
        setCart(newCart);
      }else{
        return toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      return toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
